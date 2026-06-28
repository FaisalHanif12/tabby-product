'use client'

import type {
  SessionView,
  SessionMember,
  SessionMeta,
  PaymentHandle,
  HistoryEntry,
  UserProfile,
} from '@/lib/types/tabby'

/**
 * Thin client-side wrapper over the Tabby API. Every call returns a
 * discriminated result so callers can gracefully fall back to the local mock
 * experience when the backend is unavailable (never dead-end the UI).
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

async function request<T>(
  input: string,
  init?: RequestInit,
): Promise<Result<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    })
    const body = (await res.json().catch(() => null)) as any
    if (!res.ok) {
      return { ok: false, error: body?.error ?? `Request failed (${res.status})` }
    }
    return { ok: true, data: body as T }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

export type CreateSessionResult = {
  id: string
  sharePath: string
  hostMemberId: string
  session: SessionMeta
}

export function createSession(hostName?: string) {
  return request<CreateSessionResult>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ hostName: hostName?.trim() || 'Host' }),
  })
}

export function getSession(id: string) {
  return request<SessionView>(`/api/sessions/${id}`, { method: 'GET' })
}

// Host-only hard delete of an entire split.
export function deleteSession(id: string) {
  return request<{ ok: true }>(`/api/sessions/${id}`, { method: 'DELETE' })
}

export function joinSession(id: string, name: string) {
  return request<{ member: SessionMember; rejoined: boolean }>(
    `/api/sessions/${id}/members`,
    { method: 'POST', body: JSON.stringify({ name }) },
  )
}

export function setItemClaim(
  itemId: string,
  body: { sessionId: string; expenseId: string; memberId: string },
  claimed: boolean,
) {
  return request<{ ok: true }>(`/api/items/${itemId}/claim`, {
    method: claimed ? 'POST' : 'DELETE',
    body: JSON.stringify(body),
  })
}

export type ParsedReceipt = {
  merchant: string | null
  items: { label: string; qty: number; unitPrice: number }[]
  subtotal: number | null
  tax: number | null
  tip: number | null
  total: number | null
}

export async function presignUpload(body: {
  sessionId: string
  contentType: string
  size: number
}) {
  return request<{ uploadUrl: string; objectKey: string }>(
    `/api/sessions/${body.sessionId}/upload-url`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function uploadToS3(url: string, file: File): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': file.type },
      body: file,
    })
    return res.ok
  } catch {
    return false
  }
}

export function parseReceipt(sessionId: string, objectKey: string) {
  // The route responds with { receipt: <parsed> } — see parse-receipt/route.ts.
  return request<{ receipt: ParsedReceipt }>(
    `/api/sessions/${sessionId}/parse-receipt`,
    { method: 'POST', body: JSON.stringify({ objectKey }) },
  )
}

export function createExpense(
  sessionId: string,
  body: {
    merchant?: string | null
    items: { label: string; qty: number; unitPrice: number }[]
    tax: number
    tip: number
    receiptKey?: string | null
  },
) {
  return request<{ expense: { id: string } }>(
    `/api/sessions/${sessionId}/expense`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export function settleSession(id: string) {
  return request<{ settlement: unknown }>(
    `/api/sessions/${id}/settle`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export type SettlementView = {
  payerId: string
  members: SessionMember[]
  split: {
    perMember: {
      memberId: string
      subtotal: number
      taxShare: number
      tipShare: number
      total: number
    }[]
    subtotal: number
    tax: number
    tip: number
    total: number
  } | null
  settle: {
    payerId: string
    rows: { memberId: string; amount: number }[]
    totalOwed: number
  } | null
  /** Payer's saved payment handle (when they're a signed-in user). */
  payerHandle?: PaymentHandle | null
}

export function getSettlement(id: string) {
  return request<SettlementView>(`/api/sessions/${id}/settle`, {
    method: 'GET',
  })
}

/* ── Optional auth: linking, history, profile ──────────────────────────── */

export function linkGuestSessions(
  links: { sessionId: string; memberId: string }[],
) {
  return request<{ linked: number; sessions: string[] }>('/api/auth/link', {
    method: 'POST',
    body: JSON.stringify({ links }),
  })
}

export function getMyHistory() {
  return request<{ entries: HistoryEntry[] }>('/api/me/history', {
    method: 'GET',
  })
}

export function getMyProfile() {
  return request<{ profile: UserProfile | null }>('/api/me/profile', {
    method: 'GET',
  })
}

export function updateMyProfile(body: {
  displayName?: string | null
  paymentHandle?: PaymentHandle | null
}) {
  return request<{ profile: UserProfile }>('/api/me/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
