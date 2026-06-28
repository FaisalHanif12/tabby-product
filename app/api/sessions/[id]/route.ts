import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { PatchSessionSchema } from '@/lib/validation/schemas'
import {
  getSessionView,
  getHostToken,
  patchSession,
  getSessionStatus,
} from '@/lib/db/repository'
import { getHostCookie } from '@/lib/auth/cookies'

export const runtime = 'nodejs'

// GET /api/sessions/[id] — full session view (used by Claim + polling).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const view = await getSessionView(id)
    if (!view.meta) return fail('Session not found', 404)
    return ok(view)
  } catch (err) {
    return serverError('GET /api/sessions/[id]', err)
  }
}

// PATCH /api/sessions/[id] — host-only updates to tax/tip/merchant/status.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data, error } = await parseBody(req, PatchSessionSchema)
  if (error) return error

  try {
    const [storedToken, cookieToken] = await Promise.all([
      getHostToken(id),
      getHostCookie(id),
    ])
    if (!storedToken) return fail('Session not found', 404)
    if (!cookieToken || cookieToken !== storedToken) {
      return fail('Only the host can update this split', 403)
    }
    if ((await getSessionStatus(id)) === 'settled') {
      return fail('This split is settled and locked', 409)
    }

    await patchSession(id, data)
    const view = await getSessionView(id)
    return ok(view)
  } catch (err) {
    return serverError('PATCH /api/sessions/[id]', err)
  }
}
