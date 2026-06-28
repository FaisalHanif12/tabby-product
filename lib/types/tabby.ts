/**
 * Server/domain types for Tabby. These describe the shapes returned by the API
 * and the repository mapper. The client mock types in `lib/tabby-data.ts` are
 * kept separate so the existing UI keeps compiling unchanged.
 */

export type SessionStatus = 'open' | 'expensed' | 'settled'

export interface SessionMeta {
  id: string
  payerId: string
  status: SessionStatus
  currency: string
  version: number
  createdAt: number
  expiresAt: number
  merchant?: string | null
  hostName?: string | null
  expenseId?: string | null
}

export interface SessionMember {
  id: string
  name: string
  initials: string
  color: string
  isHost: boolean
  joinedAt: number
}

export interface Expense {
  id: string
  merchant: string | null
  subtotal: number
  tax: number
  tip: number
  total: number
  receiptKey?: string | null
  createdAt: number
}

export interface SessionItem {
  id: string
  expenseId: string
  label: string
  qty: number
  unitPrice: number
  price: number
  claimedBy: string[]
}

export interface SettlementBreakdownRow {
  memberId: string
  amount: number
}

export interface Settlement {
  ts: number
  payerId: string
  total: number
  breakdown: SettlementBreakdownRow[]
  createdAt: number
}

/** Shape produced by the repository mapper from a single-session Query. */
export interface SessionView {
  meta: SessionMeta | null
  members: SessionMember[]
  expense: Expense | null
  items: SessionItem[]
}

/* ── Optional auth: profile, payment handle, saved history ──────────────────
 * These power the signed-in experience and are entirely additive — the
 * anonymous flow never reads or writes any of them.
 */

export type PaymentProvider = 'venmo' | 'cashapp' | 'paypal'

export interface PaymentHandle {
  provider: PaymentProvider
  /** The username only — no '@', no URL. e.g. "jane-doe". */
  username: string
}

/** A signed-in user's personalization record: PK=USER#<userId> SK=PROFILE. */
export interface UserProfile {
  userId: string
  displayName: string | null
  paymentHandle: PaymentHandle | null
  avatarUrl: string | null
  updatedAt: number
}

/**
 * A USERLINK row ties a guest member (memberId within a session) to a signed-in
 * Clerk userId. Carries a denormalized snapshot so history renders from a single
 * GSI1 query, and is enriched with live data when the session still exists.
 */
export interface UserSplitLink {
  userId: string
  sessionId: string
  memberId: string
  createdAt: number
  merchant: string | null
  total: number
  share: number
  status: SessionStatus
}

/** One row in the signed-in /history list. */
export interface HistoryEntry {
  sessionId: string
  title: string
  total: number
  yourShare: number
  status: SessionStatus
  createdAt: number
  /** Deep link back into this split's settle view. */
  href: string
}
