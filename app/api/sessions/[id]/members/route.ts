import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { JoinMemberSchema } from '@/lib/validation/schemas'
import { addMember, getMember, getSessionView } from '@/lib/db/repository'
import { getMemberCookie, setMemberCookie } from '@/lib/auth/cookies'

export const runtime = 'nodejs'

// POST /api/sessions/[id]/members — a guest joins the split with their name.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data, error } = await parseBody(req, JoinMemberSchema)
  if (error) return error

  try {
    const view = await getSessionView(id)
    if (!view.meta) return fail('Session not found', 404)

    // If this browser already joined, return the existing member (no dupes).
    const existingId = await getMemberCookie(id)
    if (existingId) {
      const existing = await getMember(id, existingId)
      if (existing) return ok({ member: existing, rejoined: true })
    }

    const member = await addMember(id, data.name)
    await setMemberCookie(id, member.id)

    return ok({ member, rejoined: false }, { status: 201 })
  } catch (err) {
    return serverError('POST /api/sessions/[id]/members', err)
  }
}
