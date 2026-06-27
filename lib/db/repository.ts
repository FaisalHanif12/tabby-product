import 'server-only'

import {
  QueryCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import { nanoid } from 'nanoid'
import { ddb, TABLE_NAME } from './client'
import { pk, sk, groupKey, skPrefix } from './keys'
import { initialsOf, colorForIndex } from '@/lib/domain/members'
import type {
  SessionView,
  SessionMeta,
  SessionMember,
  Expense,
  SessionItem,
  Settlement,
  SettlementBreakdownRow,
} from '@/lib/types/tabby'

/* ── Row shapes (single table) ─────────────────────────────────────── */

type Row = Record<string, any>

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

/** Normalise a DynamoDB string set (or absent value) into a string array. */
function toStringArray(value: unknown): string[] {
  if (!value) return []
  if (value instanceof Set) return Array.from(value) as string[]
  if (Array.isArray(value)) return value as string[]
  return []
}

/* ── Create ────────────────────────────────────────────────────────── */

export async function createSession(opts: {
  hostName: string
  currency: string
}): Promise<{ session: SessionMeta; hostMemberId: string; hostToken: string }> {
  const id = nanoid(21)
  const hostMemberId = nanoid(12)
  const hostToken = nanoid(32)
  const now = Date.now()

  const meta: SessionMeta = {
    id,
    payerId: hostMemberId,
    status: 'open',
    currency: opts.currency,
    version: 1,
    createdAt: now,
    expiresAt: 0,
  }

  const ttl = Math.floor(now / 1000) + SESSION_TTL_SECONDS

  const metaRow: Row = {
    ...groupKey(id, sk.meta()),
    type: 'META',
    id,
    payerId: hostMemberId,
    status: 'open',
    currency: opts.currency,
    version: 1,
    createdAt: now,
    hostName: opts.hostName,
    hostToken,
    ttl,
  }

  const hostRow: Row = {
    ...groupKey(id, sk.member(hostMemberId)),
    type: 'MEMBER',
    memberId: hostMemberId,
    name: opts.hostName,
    initials: initialsOf(opts.hostName),
    color: colorForIndex(0),
    isHost: true,
    joinedAt: now,
    ttl,
  }

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: metaRow } },
        { Put: { TableName: TABLE_NAME, Item: hostRow } },
      ],
    }),
  )

  return { session: { ...meta, hostName: opts.hostName }, hostMemberId, hostToken }
}

export async function addMember(
  sessionId: string,
  name: string,
): Promise<SessionMember> {
  const existing = await listMembers(sessionId)
  const memberId = nanoid(12)
  const now = Date.now()
  const ttl = Math.floor(now / 1000) + SESSION_TTL_SECONDS

  const row: Row = {
    ...groupKey(sessionId, sk.member(memberId)),
    type: 'MEMBER',
    memberId,
    name,
    initials: initialsOf(name),
    color: colorForIndex(existing.length),
    isHost: false,
    joinedAt: now,
    ttl,
  }

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: row }))
  await bumpVersion(sessionId)

  return {
    id: memberId,
    name,
    initials: row.initials,
    color: row.color,
    isHost: false,
    joinedAt: now,
  }
}

export async function createExpense(
  sessionId: string,
  input: {
    merchant?: string | null
    items: { label: string; qty: number; unitPrice: number }[]
    tax: number
    tip: number
    receiptKey?: string | null
  },
): Promise<Expense> {
  const expenseId = nanoid(12)
  const now = Date.now()
  const ttl = Math.floor(now / 1000) + SESSION_TTL_SECONDS

  const subtotal =
    Math.round(
      input.items.reduce((s, it) => s + it.qty * it.unitPrice, 0) * 100,
    ) / 100
  const total = Math.round((subtotal + input.tax + input.tip) * 100) / 100

  const expenseRow: Row = {
    ...groupKey(sessionId, sk.expense(expenseId)),
    type: 'EXPENSE',
    expenseId,
    merchant: input.merchant ?? null,
    subtotal,
    tax: input.tax,
    tip: input.tip,
    total,
    receiptKey: input.receiptKey ?? null,
    createdAt: now,
    ttl,
  }

  const itemRows: Row[] = input.items.map((it) => {
    const itemId = nanoid(10)
    return {
      ...groupKey(sessionId, sk.item(expenseId, itemId)),
      type: 'ITEM',
      itemId,
      expenseId,
      label: it.label,
      qty: it.qty,
      unitPrice: it.unitPrice,
      price: Math.round(it.qty * it.unitPrice * 100) / 100,
      ttl,
    }
  })

  // DynamoDB transactions allow up to 100 items; receipts are far smaller.
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: expenseRow } },
        ...itemRows.map((Item) => ({ Put: { TableName: TABLE_NAME, Item } })),
      ],
    }),
  )

  // Record the active expense on META + advance status/version.
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: groupKey(sessionId, sk.meta()),
      UpdateExpression:
        'SET expenseId = :e, #s = :status ADD version :one',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':e': expenseId,
        ':status': 'expensed',
        ':one': 1,
      },
    }),
  )

  return {
    id: expenseId,
    merchant: expenseRow.merchant,
    subtotal,
    tax: input.tax,
    tip: input.tip,
    total,
    receiptKey: expenseRow.receiptKey,
    createdAt: now,
  }
}

/* ── Atomic claim / unclaim (concurrency-safe, no read-modify-write) ── */

export async function claimItem(opts: {
  sessionId: string
  expenseId: string
  itemId: string
  memberId: string
}): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: groupKey(opts.sessionId, sk.item(opts.expenseId, opts.itemId)),
      UpdateExpression: 'ADD claimedBy :m',
      ExpressionAttributeValues: { ':m': new Set([opts.memberId]) },
      ConditionExpression: 'attribute_exists(PK)',
    }),
  )
  await bumpVersion(opts.sessionId)
}

export async function unclaimItem(opts: {
  sessionId: string
  expenseId: string
  itemId: string
  memberId: string
}): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: groupKey(opts.sessionId, sk.item(opts.expenseId, opts.itemId)),
      UpdateExpression: 'DELETE claimedBy :m',
      ExpressionAttributeValues: { ':m': new Set([opts.memberId]) },
      ConditionExpression: 'attribute_exists(PK)',
    }),
  )
  await bumpVersion(opts.sessionId)
}

/* ── Patch / status / version ──────────────────────────────────────── */

export async function patchSession(
  sessionId: string,
  updates: {
    merchant?: string | null
    status?: 'open' | 'expensed' | 'settled'
    tax?: number | null
    tip?: number | null
  },
): Promise<void> {
  // Meta-level fields (status) + always bump the session version.
  const names: Record<string, string> = {}
  const values: Record<string, any> = { ':one': 1 }
  let metaExpr = 'ADD version :one'

  if (updates.status !== undefined) {
    names['#s'] = 'status'
    values[':status'] = updates.status
    metaExpr = 'SET #s = :status ADD version :one'
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: groupKey(sessionId, sk.meta()),
      UpdateExpression: metaExpr,
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
    }),
  )

  // Tax / tip / merchant live on the EXPENSE row, if one exists.
  if (
    updates.tax !== undefined ||
    updates.tip !== undefined ||
    updates.merchant !== undefined
  ) {
    const view = await getSessionView(sessionId)
    if (view.expense) {
      await updateExpenseTotals(sessionId, view.expense.id, {
        tax: updates.tax ?? undefined,
        tip: updates.tip ?? undefined,
        merchant: updates.merchant,
        subtotal: view.expense.subtotal,
      })
    }
  }
}

async function updateExpenseTotals(
  sessionId: string,
  expenseId: string,
  opts: {
    tax?: number
    tip?: number
    merchant?: string | null
    subtotal: number
  },
): Promise<void> {
  const sets: string[] = []
  const values: Record<string, any> = {}
  const names: Record<string, string> = {}

  let tax: number | undefined = opts.tax
  let tip: number | undefined = opts.tip

  // We need current tax/tip to recompute total when only one changes.
  const current = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: groupKey(sessionId, sk.expense(expenseId)),
    }),
  )
  const cur = current.Item as Row | undefined
  if (!cur) return
  if (tax === undefined) tax = cur.tax
  if (tip === undefined) tip = cur.tip

  if (opts.tax !== undefined) {
    sets.push('tax = :tax')
    values[':tax'] = opts.tax
  }
  if (opts.tip !== undefined) {
    sets.push('tip = :tip')
    values[':tip'] = opts.tip
  }
  if (opts.merchant !== undefined) {
    sets.push('merchant = :merchant')
    values[':merchant'] = opts.merchant
  }

  const total = Math.round((opts.subtotal + (tax ?? 0) + (tip ?? 0)) * 100) / 100
  sets.push('#t = :total')
  names['#t'] = 'total'
  values[':total'] = total

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: groupKey(sessionId, sk.expense(expenseId)),
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  )
}

export async function bumpVersion(sessionId: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: groupKey(sessionId, sk.meta()),
      UpdateExpression: 'ADD version :one',
      ExpressionAttributeValues: { ':one': 1 },
      ConditionExpression: 'attribute_exists(PK)',
    }),
  )
}

export async function recordSettlement(
  sessionId: string,
  payerId: string,
  breakdown: SettlementBreakdownRow[],
): Promise<Settlement> {
  const ts = Date.now()
  const ttl = Math.floor(ts / 1000) + SESSION_TTL_SECONDS
  const total =
    Math.round(breakdown.reduce((s, r) => s + r.amount, 0) * 100) / 100

  const row: Row = {
    ...groupKey(sessionId, sk.settlement(ts)),
    type: 'SETTLEMENT',
    ts,
    payerId,
    total,
    breakdown,
    createdAt: ts,
    ttl,
  }

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: row }))
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: groupKey(sessionId, sk.meta()),
      UpdateExpression: 'SET #s = :status ADD version :one',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'settled', ':one': 1 },
    }),
  )

  return { ts, payerId, total, breakdown, createdAt: ts }
}

/* ── Reads ─────────────────────────────────────────────────────────── */

async function listMembers(sessionId: string): Promise<SessionMember[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': pk(sessionId),
        ':sk': skPrefix.member,
      },
    }),
  )
  return (res.Items ?? []).map(mapMember)
}

export async function getMember(
  sessionId: string,
  memberId: string,
): Promise<SessionMember | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: groupKey(sessionId, sk.member(memberId)),
    }),
  )
  return res.Item ? mapMember(res.Item) : null
}

export async function getHostToken(sessionId: string): Promise<string | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: groupKey(sessionId, sk.meta()),
      ProjectionExpression: 'hostToken',
    }),
  )
  return (res.Item?.hostToken as string) ?? null
}

/**
 * Single Query on PK=GROUP#<id>, mapped into the view the frontend consumes.
 */
export async function getSessionView(sessionId: string): Promise<SessionView> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': pk(sessionId) },
    }),
  )

  const rows = (res.Items ?? []) as Row[]
  let meta: SessionMeta | null = null
  const members: SessionMember[] = []
  let expense: Expense | null = null
  const items: SessionItem[] = []

  for (const row of rows) {
    switch (row.type) {
      case 'META':
        meta = mapMeta(row)
        break
      case 'MEMBER':
        members.push(mapMember(row))
        break
      case 'EXPENSE':
        expense = mapExpense(row)
        break
      case 'ITEM':
        items.push(mapItem(row))
        break
      default:
        break
    }
  }

  members.sort((a, b) => a.joinedAt - b.joinedAt)

  return { meta, members, expense, items }
}

/* ── Mappers ───────────────────────────────────────────────────────── */

function mapMeta(row: Row): SessionMeta {
  return {
    id: row.id,
    payerId: row.payerId,
    status: row.status,
    currency: row.currency,
    version: row.version ?? 1,
    createdAt: row.createdAt,
    expiresAt: (row.ttl ?? 0) * 1000,
    merchant: row.merchant ?? null,
    hostName: row.hostName ?? null,
    expenseId: row.expenseId ?? null,
  }
}

function mapMember(row: Row): SessionMember {
  return {
    id: row.memberId,
    name: row.name,
    initials: row.initials,
    color: row.color,
    isHost: Boolean(row.isHost),
    joinedAt: row.joinedAt ?? 0,
  }
}

function mapExpense(row: Row): Expense {
  return {
    id: row.expenseId,
    merchant: row.merchant ?? null,
    subtotal: row.subtotal ?? 0,
    tax: row.tax ?? 0,
    tip: row.tip ?? 0,
    total: row.total ?? 0,
    receiptKey: row.receiptKey ?? null,
    createdAt: row.createdAt ?? 0,
  }
}

function mapItem(row: Row): SessionItem {
  return {
    id: row.itemId,
    expenseId: row.expenseId,
    label: row.label,
    qty: row.qty ?? 1,
    unitPrice: row.unitPrice ?? 0,
    price: row.price ?? 0,
    claimedBy: toStringArray(row.claimedBy),
  }
}
