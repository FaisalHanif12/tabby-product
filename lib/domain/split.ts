/**
 * PURE bill-splitting logic — no IO, fully deterministic.
 *
 * Rules:
 *  - A line item's cost is split evenly across everyone who claimed it.
 *  - An item nobody claimed is split evenly across all members (so the bill is
 *    always fully covered).
 *  - Tax + tip are distributed in proportion to each member's claimed subtotal.
 *  - All arithmetic is done in integer cents with a largest-remainder
 *    allocator, guaranteeing Σ(member totals) === receipt total to the cent.
 */

export interface SplitItemInput {
  id: string
  /** Total price of the line (qty * unitPrice). */
  price: number
  /** Member ids who claimed this item. */
  claimedBy: string[]
}

export interface SplitInput {
  items: SplitItemInput[]
  /** Every member id in the session (used for unclaimed items + even fallback). */
  memberIds: string[]
  tax: number
  tip: number
}

export interface MemberShare {
  memberId: string
  subtotal: number
  taxShare: number
  tipShare: number
  total: number
}

export interface SplitResult {
  perMember: MemberShare[]
  subtotal: number
  tax: number
  tip: number
  total: number
}

const toCents = (n: number): number => Math.round((Number(n) || 0) * 100)
const toDollars = (cents: number): number => cents / 100

/**
 * Allocate `totalCents` across `memberIds` proportionally to `weights`,
 * distributing any rounding remainder by largest fractional part (ties broken
 * deterministically by member id). When all weights are zero, split evenly.
 */
function allocate(
  totalCents: number,
  memberIds: string[],
  weights: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {}
  if (memberIds.length === 0 || totalCents === 0) {
    for (const id of memberIds) result[id] = 0
    return result
  }

  const weightSum = memberIds.reduce((s, id) => s + (weights[id] || 0), 0)
  const useEven = weightSum <= 0

  const exact: { id: string; floor: number; frac: number }[] = memberIds.map(
    (id) => {
      const share = useEven
        ? totalCents / memberIds.length
        : (totalCents * (weights[id] || 0)) / weightSum
      const floor = Math.floor(share)
      return { id, floor, frac: share - floor }
    },
  )

  let allocated = 0
  for (const e of exact) {
    result[e.id] = e.floor
    allocated += e.floor
  }

  let remainder = totalCents - allocated
  // Hand out the leftover cents to the largest fractional parts first.
  const order = [...exact].sort(
    (a, b) => b.frac - a.frac || (a.id < b.id ? -1 : 1),
  )
  for (let i = 0; i < order.length && remainder > 0; i++) {
    result[order[i].id] += 1
    remainder -= 1
  }
  return result
}

export function splitBill(input: SplitInput): SplitResult {
  const { items, memberIds, tax, tip } = input

  const subtotalCentsByMember: Record<string, number> = {}
  for (const id of memberIds) subtotalCentsByMember[id] = 0

  let subtotalCents = 0

  for (const item of items) {
    const itemCents = toCents(item.price)
    subtotalCents += itemCents

    const claimers =
      item.claimedBy.length > 0
        ? item.claimedBy.filter((id) => memberIds.includes(id))
        : memberIds

    const targets = claimers.length > 0 ? claimers : memberIds
    if (targets.length === 0) continue

    // Even split of this single item across its targets, cent-exact.
    const weights: Record<string, number> = {}
    for (const id of targets) weights[id] = 1
    const alloc = allocate(itemCents, targets, weights)
    for (const id of targets) subtotalCentsByMember[id] += alloc[id]
  }

  const taxCents = toCents(tax)
  const tipCents = toCents(tip)

  const taxByMember = allocate(taxCents, memberIds, subtotalCentsByMember)
  const tipByMember = allocate(tipCents, memberIds, subtotalCentsByMember)

  const perMember: MemberShare[] = memberIds.map((id) => {
    const sub = subtotalCentsByMember[id]
    const t = taxByMember[id]
    const tp = tipByMember[id]
    return {
      memberId: id,
      subtotal: toDollars(sub),
      taxShare: toDollars(t),
      tipShare: toDollars(tp),
      total: toDollars(sub + t + tp),
    }
  })

  return {
    perMember,
    subtotal: toDollars(subtotalCents),
    tax: toDollars(taxCents),
    tip: toDollars(tipCents),
    total: toDollars(subtotalCents + taxCents + tipCents),
  }
}
