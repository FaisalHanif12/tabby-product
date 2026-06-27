import { generateText, Output } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { ParseReceiptSchema, ReceiptSchema } from '@/lib/validation/schemas'
import { getObjectBytes } from '@/lib/aws/s3'
import { isSessionHost } from '@/lib/auth/guards'

export const runtime = 'nodejs'
// Vision OCR can take a few seconds on large receipts.
export const maxDuration = 60

const OCR_MODEL = process.env.OCR_MODEL || 'google/gemini-2.5-flash'

const SYSTEM_PROMPT = [
  'You are a receipt OCR parser. Extract every line item from the receipt image.',
  'Return prices as numbers in the receipt currency (no symbols).',
  'If a line shows a quantity, set qty accordingly and unitPrice as the per-unit price.',
  'Do not invent items. If tax, tip, subtotal, or total are not present, return null for them.',
].join(' ')

/**
 * POST /api/sessions/[id]/parse-receipt
 * Server-side OCR proxy: pulls the uploaded image from S3 and runs a vision
 * model through OpenRouter, returning a structured, schema-validated receipt.
 * The API key never reaches the client.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { data, error } = await parseBody(req, ParseReceiptSchema)
  if (error) return error

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return fail('OCR is not configured', 503)
  if (!(await isSessionHost(id))) {
    return fail('Only the host can scan a receipt', 403)
  }
  // The object must belong to this session's receipts prefix.
  if (!data.objectKey.startsWith(`receipts/${id}/`)) {
    return fail('Object does not belong to this session', 403)
  }

  try {
    const { bytes, contentType } = await getObjectBytes(data.objectKey)
    const openrouter = createOpenRouter({ apiKey })

    const result = await generateText({
      model: openrouter(OCR_MODEL),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: ReceiptSchema }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the line items from this receipt.' },
            { type: 'file', data: bytes, mediaType: contentType },
          ],
        },
      ],
    })

    return ok({ receipt: result.output })
  } catch (err) {
    return serverError('POST /api/sessions/[id]/parse-receipt', err)
  }
}
