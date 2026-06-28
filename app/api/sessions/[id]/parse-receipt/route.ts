import { ok, fail, parseBody, serverError } from '@/lib/api/respond'
import { ParseReceiptSchema, ReceiptSchema } from '@/lib/validation/schemas'
import type { Receipt } from '@/lib/validation/schemas'
import { getObjectBytes } from '@/lib/aws/s3'
import { isSessionHost } from '@/lib/auth/guards'
import { extractReceiptJson } from '@/lib/domain/receipt-parse'

export const runtime = 'nodejs'
// Vision OCR can take a few seconds on large receipts.
export const maxDuration = 60

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Universal, language- and category-agnostic instructions, plus an explicit
 * JSON contract. The image may be ANY receipt/bill — restaurant, grocery,
 * pharmacy, retail, transport — in ANY language. We call OpenRouter's
 * OpenAI-compatible REST API DIRECTLY (no @openrouter/ai-sdk-provider, which is
 * pinned to AI SDK v6 and breaks against the v7 in this project).
 */
const SYSTEM_PROMPT = [
  'You are a universal receipt and bill parser.',
  'The image may be ANY kind of purchase receipt — restaurant, cafe, grocery,',
  'supermarket, retail, pharmacy, transport, utilities — printed or handwritten,',
  'in ANY language or script.',
  'Extract every purchased line item exactly as printed.',
  "Keep each item's label in the receipt's ORIGINAL language and script — do not translate.",
  'Prices must be plain numbers in the receipt currency, no symbols, using a dot as the decimal separator.',
  'If a line shows a quantity, set qty to that quantity and unitPrice to the PER-UNIT price (line total / qty).',
  'If no quantity is shown, use qty = 1 and unitPrice = the line price.',
  'Ignore non-item lines: store name/address/phone, cashier, dates, barcodes, loyalty points, payment/change/card lines.',
  'For subtotal, tax, tip, total: use the printed value if present, otherwise null. Many receipts have no tip — use null, do not guess.',
  'Never invent items or amounts.',
  'Respond with ONLY a single JSON object, no markdown, no commentary, of exactly this shape:',
  '{"merchant": string|null, "items": [{"label": string, "qty": number, "unitPrice": number}], "subtotal": number|null, "tax": number|null, "tip": number|null, "total": number|null}',
].join(' ')

/**
 * Try the configured model first, then resilient fallbacks, so a mis-set or
 * unavailable OCR_MODEL doesn't break scanning.
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

/** One OpenRouter chat-completion call with the receipt image. */
async function callModel(
  apiKey: string,
  model: string,
  dataUrl: string,
): Promise<Receipt> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // OpenRouter attribution headers (optional but recommended).
      'HTTP-Referer': 'https://tabby-product.vercel.app',
      'X-Title': 'Tabby',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract this receipt as JSON.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Surface status so the caller can distinguish auth (401/403) from model
    // errors (400/404) in the logs.
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`)
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned no content')
  }

  const json = extractReceiptJson(content)
  if (json === null) {
    throw new Error('Could not parse JSON from model output')
  }

  const parsed = ReceiptSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(
      `Schema validation failed: ${JSON.stringify(parsed.error.issues).slice(0, 200)}`,
    )
  }
  return parsed.data
}

/**
 * POST /api/sessions/[id]/parse-receipt
 * Server-side OCR proxy. The OpenRouter API key never reaches the client.
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

  // Vision needs a real image media type; some S3 objects come back as
  // application/octet-stream. Build a data URL the chat API accepts.
  const mediaType = contentType.startsWith('image/') ? contentType : 'image/jpeg'
  const dataUrl = `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`

  let lastErr: unknown = null
  for (const model of modelCandidates()) {
    try {
      const receipt = await callModel(apiKey, model, dataUrl)
      return ok({ receipt, model })
    } catch (err) {
      lastErr = err
      console.log(
        `[v0] parse-receipt model "${model}" failed:`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  // If the failure was authentication, say so plainly — this is almost always a
  // missing/invalid OPENROUTER_API_KEY rather than a transient error.
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  if (msg.includes('OpenRouter 401') || msg.includes('OpenRouter 403')) {
    return fail(
      'OCR provider rejected the API key. Check OPENROUTER_API_KEY in the environment.',
      502,
    )
  }
  return serverError('POST /api/sessions/[id]/parse-receipt', lastErr)
}
