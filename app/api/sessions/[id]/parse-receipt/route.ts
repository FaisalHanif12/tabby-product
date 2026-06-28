import { generateObject } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { ParseReceiptSchema, ReceiptSchema } from '@/lib/validation/schemas'
import { getObjectBytes } from '@/lib/aws/s3'
import { isSessionHost } from '@/lib/auth/guards'

export const runtime = 'nodejs'
// Vision OCR can take a few seconds on large receipts.
export const maxDuration = 60

/**
 * Universal, language- and category-agnostic instructions. The image may be ANY
 * receipt/bill — restaurant, grocery, supermarket, pharmacy, retail, transport —
 * in ANY language. We keep item labels in their original script and never invent.
 */
const SYSTEM_PROMPT = [
  'You are a universal receipt and bill parser.',
  'The image may be ANY kind of purchase receipt — restaurant, cafe, grocery,',
  'supermarket, retail, pharmacy, transport, utilities — printed or handwritten,',
  'in ANY language or script.',
  'Extract every purchased line item exactly as printed.',
  "Keep each item's label in the receipt's ORIGINAL language and script — do not translate.",
  'Prices must be plain numbers in the receipt currency, no currency symbols, using a dot as the decimal separator.',
  'If a line shows a quantity, set qty to that quantity and unitPrice to the PER-UNIT price (line total ÷ qty).',
  'If no quantity is shown, use qty = 1 and unitPrice = the line price.',
  'Ignore non-item lines: store name/address/phone, cashier, dates, barcodes, loyalty points, and payment/change/card lines.',
  'For subtotal, tax, tip, and total: return the printed value if present, otherwise null.',
  'Many receipts (e.g. groceries) have no tip — use null for it, do not guess.',
  'Never invent items or amounts; return only what is actually on the receipt.',
].join(' ')

/**
 * Try the configured model first, then resilient fallbacks, so a mis-set or
 * unavailable OCR_MODEL doesn't break scanning. Order: env model → current
 * Gemini Flash vision models → a GPT vision fallback.
 */
function modelCandidates(): string[] {
  const configured = process.env.OCR_MODEL?.trim()
  const fallbacks = [
    'google/gemini-2.5-flash',
    'google/gemini-2.0-flash-001',
    'openai/gpt-4o-mini',
  ]
  return Array.from(
    new Set([configured, ...fallbacks].filter(Boolean) as string[]),
  )
}

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

  let bytes: Uint8Array
  let contentType: string
  try {
    const obj = await getObjectBytes(data.objectKey)
    bytes = obj.bytes
    contentType = obj.contentType
  } catch (err) {
    return serverError('parse-receipt: S3 read', err)
  }

  // Vision models need a real image media type; some S3 objects come back as
  // application/octet-stream. Fall back to JPEG in that case.
  const mediaType = contentType.startsWith('image/') ? contentType : 'image/jpeg'

  const openrouter = createOpenRouter({ apiKey })
  let lastErr: unknown = null

  for (const model of modelCandidates()) {
    try {
      const { object } = await generateObject({
        model: openrouter(model),
        schema: ReceiptSchema,
        schemaName: 'Receipt',
        schemaDescription:
          'Structured contents of a purchase receipt in any language.',
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the merchant, every line item, and the subtotal/tax/tip/total from this receipt.',
              },
              { type: 'image', image: bytes, mediaType },
            ],
          },
        ],
      })

      return ok({ receipt: object, model })
    } catch (err) {
      lastErr = err
      console.log(
        `[v0] parse-receipt model "${model}" failed:`,
        err instanceof Error ? err.message : err,
      )
      // Try the next candidate model.
    }
  }

  console.log('[v0] parse-receipt: all candidate models failed')
  return serverError('POST /api/sessions/[id]/parse-receipt', lastErr)
}
