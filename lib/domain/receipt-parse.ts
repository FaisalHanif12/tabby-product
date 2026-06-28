/**
 * PURE helper: pull a JSON object out of a model's text response — no IO.
 *
 * Models sometimes wrap JSON in ```code fences``` or add a sentence of prose
 * even when asked not to. This extracts the first balanced top-level object and
 * parses it, returning null if nothing valid is found. Kept pure so it's unit
 * tested without any network.
 */
export function extractReceiptJson(text: string): unknown | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()

  // Fast path: the whole thing is JSON.
  try {
    return JSON.parse(cleaned)
  } catch {
    /* fall through to brace scanning */
  }

  // Find the first balanced {...} object, respecting strings/escapes.
  const start = cleaned.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}
