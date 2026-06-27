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
