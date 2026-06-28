import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { CreateExpenseSchema } from '@/lib/validation/schemas'
import { createExpense, getSessionView } from '@/lib/db/repository'
import { isSessionHost } from '@/lib/auth/guards'

export const runtime = 'nodejs'

/**
 * POST /api/sessions/[id]/expense
 * Host confirms the reviewed/edited receipt. Persists the expense + line items
 * and flips the session to "expensed" so guests can start claiming.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { data, error } = await parseBody(req, CreateExpenseSchema)
  if (error) return error

  if (!(await isSessionHost(id))) {
    return fail('Only the host can save the receipt', 403)
  }

  try {
    const view = await getSessionView(id)
    if (!view.meta) return fail('Session not found', 404)
    if (view.meta.status === 'settled') {
      return fail('This split is settled and locked', 409)
    }

    const expense = await createExpense(id, {
      merchant: data.merchant ?? null,
      items: data.items.map((it) => ({
        label: it.label,
        qty: it.qty,
        unitPrice: it.unitPrice,
      })),
      tax: data.tax,
      tip: data.tip,
      receiptKey: data.receiptKey ?? null,
    })

    return ok({ expense }, { status: 201 })
  } catch (err) {
    return serverError('POST /api/sessions/[id]/expense', err)
  }
}
