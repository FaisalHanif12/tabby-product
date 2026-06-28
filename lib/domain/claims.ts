/**
 * PURE claim-reconciliation helpers — no IO.
 *
 * The claim screen updates optimistically, then writes the claim to the server.
 * Meanwhile it polls the session every few seconds. A naive reconcile that just
 * replaces local items with the polled server items DROPS the current user's
 * in-flight taps (a poll can land before the write persists). These helpers let
 * the UI apply the freshest server data for OTHER members while protecting the
 * current user's pending intentions until the server catches up.
 */

export interface ClaimItem {
  id: string
  label: string
  price: number
  claimedBy: string[]
}

/**
 * Merge server items with the current user's pending claim intentions.
 *
 * For each item, if `pending` holds a desired claimed-state for `selfId`, that
 * intention overrides the server's view of `selfId`'s membership (other members
 * always reflect the server). Returns the reconciled items plus the set of item
 * ids whose pending intention the server has now satisfied (callers should clear
 * those from their pending map).
 */
export function reconcileSelfClaims(
  serverItems: ClaimItem[],
  pending: Map<string, boolean>,
  selfId: string,
): { items: ClaimItem[]; settled: string[] } {
  const settled: string[] = []

  const items = serverItems.map((it) => {
    const desired = pending.get(it.id)
    if (desired === undefined) return it

    const serverMine = it.claimedBy.includes(selfId)
    if (serverMine === desired) {
      // Server agrees with our intention — it's no longer pending.
      settled.push(it.id)
      return it
    }

    return {
      ...it,
      claimedBy: desired
        ? [...it.claimedBy, selfId]
        : it.claimedBy.filter((m) => m !== selfId),
    }
  })

  return { items, settled }
}

/** True when `selfId` has claimed every item (used by the Claim-all toggle). */
export function allClaimedBy(items: ClaimItem[], selfId: string): boolean {
  return items.length > 0 && items.every((it) => it.claimedBy.includes(selfId))
}
