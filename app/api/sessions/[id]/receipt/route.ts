import { ok, fail, serverError } from '@/lib/api/respond'
import { getSessionView } from '@/lib/db/repository'
import { splitBill } from '@/lib/domain/split'
import { settleUp } from '@/lib/domain/settle'

export const runtime = 'nodejs'

/**
 * GET /api/sessions/[id]/receipt  (P1)
 *
 * Returns a shareable, plain-text settlement summary derived from the current
 * session state. This is the data layer for an eventual rendered/stored receipt
 * image in S3; for now it returns the formatted text + structured breakdown so
 * the client can copy or share it without any extra infrastructure.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const view = await getSessionView(id)
    if (!view.meta) return fail('Session not found', 404)
    if (!view.expense) return fail('Nothing to summarise yet', 409)

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

    const currency = view.meta.currency || 'USD'
    const payerId = view.meta.payerId
    const nameOf = (mid: string) =>
      view.members.find((m) => m.id === mid)?.name ?? 'Someone'
    const money = (n: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(n)

    const merchant = view.expense.merchant || 'the bill'
    const lines = [
      `Tabby · ${merchant}`,
      `Total ${money(view.expense.total)}`,
      '',
      ...settle.rows.map(
        (r) => `${nameOf(r.memberId)} owes ${nameOf(payerId)} ${money(r.amount)}`,
      ),
    ]

    return ok({
      text: lines.join('\n'),
      payerId,
      total: view.expense.total,
      breakdown: settle.rows,
    })
  } catch (err) {
    return serverError('GET /api/sessions/[id]/receipt', err)
  }
}
