import {
  ok,
  fail,
  parseBody,
  serverError,
  tooManyRequests,
  getClientIp,
} from '@/lib/api/respond'
import { ParseReceiptSchema } from '@/lib/validation/schemas'
import type { Receipt } from '@/lib/validation/schemas'
import { getObjectBytes } from '@/lib/aws/s3'
import { isSessionHost } from '@/lib/auth/guards'
import { extractReceiptJson } from '@/lib/domain/receipt-parse'
import { normalizeReceipt } from '@/lib/domain/receipt-normalize'
import { checkRateLimit } from '@/lib/db/rate-limit'

export const runtime = 'nodejs'
// Vision OCR can take a few seconds on large receipts.
export const maxDuration = 60

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const PER_CALL_TIMEOUT_MS = 30_000

/**
 * Every call here is a paid Gemini/OpenRouter request, so it's rate-limited
 * two ways: per session (a fussy receipt gets a few retries, not unlimited
 * ones) and per IP (caps one client hammering the endpoint across many
 * sessions, since sessions themselves are free to create). Either limit alone
 * would leave a gap; together they bound worst-case spend. Env-overridable so
 * limits can be tuned in production without a code change.
 */
const SESSION_LIMIT = Number(process.env.OCR_RATE_LIMIT_SESSION_MAX ?? 8)
const SESSION_WINDOW_SECONDS = Number(
  process.env.OCR_RATE_LIMIT_SESSION_WINDOW_SECONDS ?? 600, // 10 minutes
)
const IP_LIMIT = Number(process.env.OCR_RATE_LIMIT_IP_MAX ?? 20)
const IP_WINDOW_SECONDS = Number(
  process.env.OCR_RATE_LIMIT_IP_WINDOW_SECONDS ?? 3600, // 1 hour
)

/**
 * Universal, language- and category-agnostic instructions plus an explicit JSON
 * contract. The image may be ANY receipt/bill — restaurant, grocery, pharmacy,
 * retail, transport — in ANY language. We call OpenRouter's OpenAI-compatible
 * REST API DIRECTLY (no @openrouter/ai-sdk-provider, which is pinned to AI SDK
 * v6 and breaks against the v7 in this project), then tolerantly normalize the
 * result so messy-but-valid model output never 500s.
 */
const SYSTEM_PROMPT = [
  'You are a universal receipt and bill parser.',
  'The image may be ANY kind of purchase receipt — restaurant, cafe, grocery,',
  'supermarket, retail, pharmacy, transport, utilities — printed or handwritten,',
  'in ANY language or script.',
  'Extract every purchased line item exactly as printed.',
  "Keep each item's label in the receipt's ORIGINAL language and script — do not translate.",
  'Prices must be plain numbers, no currency symbols, using a dot decimal separator.',
  'If a line shows a quantity, set qty to it and unitPrice to the PER-UNIT price (line total / qty).',
  'If no quantity is shown, use qty = 1 and unitPrice = the line price.',
  'Ignore non-item lines: store name/address/phone, cashier, dates, barcodes, loyalty points, payment/change/card lines.',
  'For subtotal, tax, tip, total: use the printed value if present, otherwise null. Many receipts have no tip — use null.',
  'Never invent items or amounts.',
  'Respond with ONLY a single minified JSON object, no markdown, no commentary, of exactly this shape:',
  '{"merchant": string|null, "items": [{"label": string, "qty": number, "unitPrice": number}], "subtotal": number|null, "tax": number|null, "tip": number|null, "total": number|null}',
].join(' ')

/** Configured model first, then resilient fallbacks. */
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

/** One OpenRouter chat-completion call; returns a tolerantly-normalized receipt. */
async function callModel(
  apiKey: string,
  model: string,
  dataUrl: string,
): Promise<Receipt> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PER_CALL_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
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
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
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
    throw new Error(`Could not parse JSON from model output: ${content.slice(0, 200)}`)
  }

  // Tolerant coercion — never throws on messy-but-present data.
  return normalizeReceipt(json)
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

  const sessionLimit = await checkRateLimit({
    scope: 'ocr-session',
    identifier: id,
    limit: SESSION_LIMIT,
    windowSeconds: SESSION_WINDOW_SECONDS,
  })
  if (!sessionLimit.allowed) {
    return tooManyRequests(
      'Too many receipt scans for this split. Please wait a moment and try again.',
      sessionLimit.retryAfterSeconds,
    )
  }

  const ipLimit = await checkRateLimit({
    scope: 'ocr-ip',
    identifier: getClientIp(req),
    limit: IP_LIMIT,
    windowSeconds: IP_WINDOW_SECONDS,
  })
  if (!ipLimit.allowed) {
    return tooManyRequests(
      'Too many receipt scans from this device. Please wait a moment and try again.',
      ipLimit.retryAfterSeconds,
    )
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

  const mediaType = contentType.startsWith('image/') ? contentType : 'image/jpeg'
  const dataUrl = `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`

  let lastErr: unknown = null
  let emptyFallback: { receipt: Receipt; model: string } | null = null

  for (const model of modelCandidates()) {
    try {
      const receipt = await callModel(apiKey, model, dataUrl)
      if (receipt.items.length > 0) {
        return ok({ receipt, model })
      }
      // Valid response but no items — remember it, but try another model first.
      emptyFallback ??= { receipt, model }
    } catch (err) {
      lastErr = err
      console.log(
        `[v0] parse-receipt model "${model}" failed:`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  // A model parsed cleanly but found no items — return it (editable empty
  // receipt) rather than erroring, so the flow never dead-ends.
  if (emptyFallback) return ok(emptyFallback)

  // Every model failed at the HTTP/parse level. Surface the real reason (this is
  // the host's own debugging path) so it's never an opaque 500 again.
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  if (msg.includes('OpenRouter 401') || msg.includes('OpenRouter 403')) {
    return fail(
      'OCR provider rejected the API key. Check OPENROUTER_API_KEY in the environment.',
      502,
    )
  }
  console.log('[v0] parse-receipt: all candidate models failed:', msg)
  return fail('OCR failed. Please try again or edit the receipt manually.', 502, {
    reason: msg,
  })
}
