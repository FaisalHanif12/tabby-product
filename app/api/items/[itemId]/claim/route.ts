import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { ClaimSchema } from '@/lib/validation/schemas'
import { claimItem, unclaimItem, getMember } from '@/lib/db/repository'
import { getMemberCookie } from '@/lib/auth/cookies'

export const runtime = 'nodejs'

async function authorize(sessionId: string, memberId: string) {
  // The claimer must be a real member of the session. Prefer the cookie-pinned
  // identity, but accept an explicit memberId that matches an existing member.
  const cookieMember = await getMemberCookie(sessionId)
  if (cookieMember && cookieMember === memberId) return true
  const member = await getMember(sessionId, memberId)
  return Boolean(member)
}

// POST /api/items/[itemId]/claim — atomically ADD the member to claimedBy.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params
  const { data, error } = await parseBody(req, ClaimSchema)
  if (error) return error

  try {
    if (!(await authorize(data.sessionId, data.memberId))) {
      return fail('Not a member of this split', 403)
    }
    await claimItem({
      sessionId: data.sessionId,
      expenseId: data.expenseId,
      itemId,
      memberId: data.memberId,
    })
    return ok({ ok: true })
  } catch (err) {
    return serverError('POST /api/items/[itemId]/claim', err)
  }
}

// DELETE /api/items/[itemId]/claim — atomically DELETE the member from claimedBy.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params
  const { data, error } = await parseBody(req, ClaimSchema)
  if (error) return error

  try {
    if (!(await authorize(data.sessionId, data.memberId))) {
      return fail('Not a member of this split', 403)
    }
    await unclaimItem({
      sessionId: data.sessionId,
      expenseId: data.expenseId,
      itemId,
      memberId: data.memberId,
    })
    return ok({ ok: true })
  } catch (err) {
    return serverError('DELETE /api/items/[itemId]/claim', err)
  }
}
