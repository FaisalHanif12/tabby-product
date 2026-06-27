/**
 * PURE settlement logic — no IO.
 *
 * One person (the payer) covered the whole bill, so every other member owes the
 * payer their own computed total. The payer's own share is self-covered and is
 * therefore excluded from the "who owes" list.
 */

import type { MemberShare } from './split'

export interface SettleRow {
  memberId: string
  amount: number
}

export interface SettleResult {
  payerId: string
  rows: SettleRow[]
  totalOwed: number
}

export function settleUp(
  perMember: Pick<MemberShare, 'memberId' | 'total'>[],
  payerId: string,
): SettleResult {
  const rows: SettleRow[] = perMember
    .filter((m) => m.memberId !== payerId && m.total > 0)
    .map((m) => ({
      memberId: m.memberId,
      // Normalise away any floating-point dust from upstream division.
      amount: Math.round(m.total * 100) / 100,
    }))

  const totalOwed = Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100

  return { payerId, rows, totalOwed }
}
