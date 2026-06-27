import { ok, fail, serverError } from '@/lib/api/respond'
import { getSessionView, recordSettlement } from '@/lib/db/repository'
import { isSessionHost } from '@/lib/auth/guards'
import { splitBill } from '@/lib/domain/split'
import { settleUp } from '@/lib/domain/settle'

export const runtime = 'nodejs'

/** Compute the cent-exact per-member split + who-owes-the-payer breakdown. */
async function computeSettlement(sessionId: string) {
  const view = await getSessionView(sessionId)
  if (!view.meta) return null
  if (!view.expense) {
    return { view, split: null, settle: null }
  }

  const split = splitBill({
    items: view.items.map((it) => ({
      id: it.id,
      price: it.price,
      claimedBy: it.claimedBy,
    })),
    memberIds: view.members.map((m) => m.id),
    tax: view.expense.tax,
    tip: view.expense.tip,
  })

  const settle = settleUp(
    split.perMember.map((m) => ({ memberId: m.memberId, total: m.total })),
    view.meta.payerId,
  )

  return { view, split, settle }
}

/**
 * GET /api/sessions/[id]/settle
 * Live settlement summary — derived on read so it always reflects the latest
 * claims. Includes per-member shares and the amounts each guest owes the payer.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const computed = await computeSettlement(id)
    if (!computed) return fail('Session not found', 404)
    return ok({
      payerId: computed.view.meta!.payerId,
      members: computed.view.members,
      split: computed.split,
      settle: computed.settle,
    })
  } catch (err) {
    return serverError('GET /api/sessions/[id]/settle', err)
  }
}

/**
 * POST /api/sessions/[id]/settle
 * Host finalises the split: snapshots the current breakdown into a SETTLEMENT
 * record and flips session status to "settled".
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!(await isSessionHost(id))) {
    return fail('Only the host can settle the split', 403)
  }
  try {
    const computed = await computeSettlement(id)
    if (!computed) return fail('Session not found', 404)
    if (!computed.settle) return fail('No expense to settle yet', 409)

    const settlement = await recordSettlement(
      id,
      computed.view.meta!.payerId,
      computed.settle.rows.map((r) => ({
        memberId: r.memberId,
        amount: r.amount,
      })),
    )
    return ok({ settlement }, { status: 201 })
  } catch (err) {
    return serverError('POST /api/sessions/[id]/settle', err)
  }
}
