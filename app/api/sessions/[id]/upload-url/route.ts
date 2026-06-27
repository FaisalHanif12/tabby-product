import { nanoid } from 'nanoid'
import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { PresignSchema } from '@/lib/validation/schemas'
import { presignPut, S3_BUCKET } from '@/lib/aws/s3'
import { isSessionHost } from '@/lib/auth/guards'

export const runtime = 'nodejs'

/**
 * POST /api/sessions/[id]/upload-url
 * Returns a short-lived presigned PUT URL so the browser uploads the receipt
 * image straight to S3 (the bytes never pass through this function).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { data, error } = await parseBody(req, PresignSchema)
  if (error) return error
  if (data.sessionId !== id) return fail('Session id mismatch', 400)

  if (!S3_BUCKET) {
    return fail('Receipt storage is not configured', 503)
  }
  if (!(await isSessionHost(id))) {
    return fail('Only the host can upload a receipt', 403)
  }

  try {
    const ext = data.contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg'
    const objectKey = `receipts/${id}/${nanoid(16)}.${ext}`
    const uploadUrl = await presignPut(objectKey, data.contentType, 60)
    return ok({ uploadUrl, objectKey, expiresIn: 60 })
  } catch (err) {
    return serverError('POST /api/sessions/[id]/upload-url', err)
  }
}
