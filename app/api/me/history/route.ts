import { ok, fail, serverError } from '@/lib/api/respond'
import { getUserId } from '@/lib/auth/clerk'
import { listUserHistory } from '@/lib/db/repository'
import { mapLinkToHistory, sortHistoryNewestFirst } from '@/lib/domain/history'

export const runtime = 'nodejs'

// GET /api/me/history — the signed-in user's past splits, newest first (GSI1).
export async function GET() {
  const userId = await getUserId()
  if (!userId) return fail('Sign in required', 401)
  try {
    const rows = await listUserHistory(userId)
    const entries = sortHistoryNewestFirst(
      rows.map((r) => mapLinkToHistory(r.link, r.live)),
    )
    return ok({ entries })
  } catch (err) {
    return serverError('GET /api/me/history', err)
  }
}
