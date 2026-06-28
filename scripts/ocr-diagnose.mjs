#!/usr/bin/env node
/**
 * OCR diagnostic — proves the OpenRouter call works end-to-end with YOUR key and
 * a real receipt image, exactly like /api/sessions/[id]/parse-receipt does.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... node scripts/ocr-diagnose.mjs ./path/to/receipt.jpg
 *   # optional: OCR_MODEL=google/gemini-3-flash-preview  (your Vercel value)
 *
 * Prints, per model: HTTP status, a snippet of the raw output, and the parsed
 * item count. The first model that returns items wins.
 */
import { readFileSync } from 'node:fs'

const apiKey = process.env.OPENROUTER_API_KEY
const imagePath = process.argv[2]

if (!apiKey) {
  console.error('Set OPENROUTER_API_KEY in the environment.')
  process.exit(1)
}
if (!imagePath) {
  console.error('Pass a receipt image path: node scripts/ocr-diagnose.mjs <image>')
  process.exit(1)
}

const ext = (imagePath.split('.').pop() || 'jpg').toLowerCase()
const mediaType =
  ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
const dataUrl = `data:${mediaType};base64,${readFileSync(imagePath).toString('base64')}`

const SYSTEM_PROMPT =
  'You are a universal receipt parser for receipts of any kind in any language. ' +
  'Respond with ONLY a single JSON object: ' +
  '{"merchant": string|null, "items": [{"label": string, "qty": number, "unitPrice": number}], "subtotal": number|null, "tax": number|null, "tip": number|null, "total": number|null}'

const models = [
  ...new Set(
    [
      process.env.OCR_MODEL?.trim(),
      'google/gemini-2.5-flash',
      'google/gemini-2.0-flash-001',
      'openai/gpt-4o-mini',
    ].filter(Boolean),
  ),
]

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {}
  const s = cleaned.indexOf('{')
  const e = cleaned.lastIndexOf('}')
  if (s >= 0 && e > s) {
    try {
      return JSON.parse(cleaned.slice(s, e + 1))
    } catch {}
  }
  return null
}

console.log(`Image: ${imagePath} (${mediaType})`)
console.log(`Models to try: ${models.join(', ')}\n`)

for (const model of models) {
  process.stdout.write(`→ ${model}: `)
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
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

    const text = await res.text()
    if (!res.ok) {
      console.log(`HTTP ${res.status} — ${text.slice(0, 200)}`)
      continue
    }
    const payload = JSON.parse(text)
    const content = payload?.choices?.[0]?.message?.content ?? ''
    const json = extractJson(content)
    const items = Array.isArray(json?.items) ? json.items : []
    console.log(`HTTP 200, items parsed: ${items.length}`)
    if (items.length > 0) {
      console.log('\n✅ SUCCESS — sample items:')
      console.log(JSON.stringify(items.slice(0, 5), null, 2))
      console.log('\nmerchant:', json.merchant, '| total:', json.total)
      process.exit(0)
    } else {
      console.log('   (raw output snippet:', content.slice(0, 160).replace(/\n/g, ' '), ')')
    }
  } catch (err) {
    console.log('threw:', err?.message || err)
  }
}

console.log('\n❌ No model returned items. See statuses above (401/403 = key issue).')
process.exit(2)
