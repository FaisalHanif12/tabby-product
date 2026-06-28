import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { UpdateProfileSchema } from '@/lib/validation/schemas'
import { getUserId } from '@/lib/auth/clerk'
import { getUserProfile, upsertUserProfile } from '@/lib/db/repository'

export const runtime = 'nodejs'

// GET /api/me/profile — the signed-in user's personalization record.
export async function GET() {
  const userId = await getUserId()
  if (!userId) return fail('Sign in required', 401)
  try {
    const profile = await getUserProfile(userId)
    return ok({ profile })
  } catch (err) {
    return serverError('GET /api/me/profile', err)
  }
}

// PUT /api/me/profile — upsert display name + default payment handle.
export async function PUT(req: Request) {
  const userId = await getUserId()
  if (!userId) return fail('Sign in required', 401)

  const { data, error } = await parseBody(req, UpdateProfileSchema)
  if (error) return error

  try {
    const profile = await upsertUserProfile(userId, {
      displayName: data.displayName,
      paymentHandle: data.paymentHandle,
    })
    return ok({ profile })
  } catch (err) {
    return serverError('PUT /api/me/profile', err)
  }
}
