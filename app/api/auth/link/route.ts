import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { LinkAccountSchema } from '@/lib/validation/schemas'
import { getUserId } from '@/lib/auth/clerk'
import { listGuestMemberships } from '@/lib/auth/cookies'
import { linkSessionToUser } from '@/lib/db/repository'

export const runtime = 'nodejs'

/**
 * POST /api/auth/link
 * Associate the signing-in user's guest splits with their Clerk account. Called
 * once the client detects a fresh sign-in (see account-linker.tsx). Idempotent.
 */
export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) return fail('Sign in required', 401)

  const { data, error } = await parseBody(req, LinkAccountSchema)
  if (error) return error

  try {
    // Merge explicit links (e.g. the just-finished split from session-store)
    // with every session the browser's cookies prove it joined. Dedupe by
    // sessionId — one USERLINK row per session per user.
    const merged = new Map<string, string>() // sessionId -> memberId
    for (const m of await listGuestMemberships()) {
      merged.set(m.sessionId, m.memberId)
    }
    for (const l of data.links ?? []) merged.set(l.sessionId, l.memberId)

    const sessions: string[] = []
    for (const [sessionId, memberId] of merged) {
      const res = await linkSessionToUser({ userId, sessionId, memberId })
      if (res) sessions.push(sessionId)
    }

    return ok({ linked: sessions.length, sessions })
  } catch (err) {
    return serverError('POST /api/auth/link', err)
  }
}
