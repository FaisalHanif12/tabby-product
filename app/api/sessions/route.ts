import { ok, parseBody, serverError } from '@/lib/api/respond'
import { CreateSessionSchema } from '@/lib/validation/schemas'
import { createSession } from '@/lib/db/repository'
import { setHostCookie, setMemberCookie } from '@/lib/auth/cookies'

export const runtime = 'nodejs'

// POST /api/sessions — create a new split session.
export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateSessionSchema)
  if (error) return error

  try {
    const { session, hostMemberId, hostToken } = await createSession({
      hostName: data.hostName,
      currency: data.currency,
    })

    // Pin the creator as host + member via httpOnly cookies.
    await setHostCookie(session.id, hostToken)
    await setMemberCookie(session.id, hostMemberId)

    return ok(
      {
        id: session.id,
        sharePath: `/s/${session.id}/join`,
        hostMemberId,
        session,
      },
      { status: 201 },
    )
  } catch (err) {
    return serverError('POST /api/sessions', err)
  }
}
