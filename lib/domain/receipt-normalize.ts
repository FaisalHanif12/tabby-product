/**
 * PURE, tolerant normalizer that turns whatever JSON a vision model returns into
 * a valid Receipt — no IO. This is the robustness layer: real models emit prices
 * as strings ("12.50"), with currency symbols ("$12.50", "Rs 1,200"), European
 * decimals ("12,50"), omit `qty`, or name fields `price`/`amount`/`name`. Strict
 * Zod validation rejected all of these and 500'd; this coerces them instead.
 */

import type { Receipt, ReceiptItem } from '@/lib/validation/schemas'

/** Parse a money-ish value (number or messy string) into a number, or null. */
export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  // Drop everything that isn't a digit, separator, or sign.
  let s = value.trim().replace(/[^0-9.,-]/g, '')
  if (!s || s === '-' || s === '.' || s === ',') return null

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // Both present: the last separator is the decimal point; strip the other.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (hasComma) {
    // Only commas: treat a single trailing ",dd" as a decimal, else thousands.
    const parts = s.split(',')
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
      s = parts[0] + '.' + parts[1]
    } else {
      s = s.replace(/,/g, '')
    }
  }

  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function toPositiveInt(value: unknown, fallback = 1): number {
  const n = toNumberOrNull(value)
  if (n === null) return fallback
  const i = Math.round(n)
  return i > 0 ? i : fallback
}

function firstString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function normalizeItem(raw: unknown): ReceiptItem | null {
  if (!raw || typeof raw !== 'object') return null
  const it = raw as Record<string, unknown>

  const label = firstString(it.label, it.name, it.description, it.item, it.title)
  if (!label) return null

  const qty = toPositiveInt(it.qty ?? it.quantity ?? it.count ?? it.qnty, 1)

  // Prefer an explicit unit price; otherwise derive it from a line total / qty.
  let unitPrice = toNumberOrNull(
    it.unitPrice ?? it.unit_price ?? it.priceEach ?? it.price_each ?? it.rate,
  )
  if (unitPrice === null) {
    const line = toNumberOrNull(
      it.price ?? it.amount ?? it.total ?? it.lineTotal ?? it.line_total ?? it.cost,
    )
    if (line !== null) unitPrice = qty > 0 ? line / qty : line
  }
  if (unitPrice === null) unitPrice = 0

  return { label, qty, unitPrice: round2(unitPrice) }
}

export function normalizeReceipt(raw: unknown): Receipt {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const merchant = firstString(obj.merchant, obj.store, obj.vendor, obj.name) || null

  const rawItems = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.lineItems)
      ? obj.lineItems
      : Array.isArray(obj.line_items)
        ? obj.line_items
        : []

  const items = rawItems
    .map(normalizeItem)
    .filter((x): x is ReceiptItem => x !== null)

  const subtotal = toNumberOrNull(obj.subtotal ?? obj.sub_total)
  const tax = toNumberOrNull(obj.tax ?? obj.vat ?? obj.gst)
  const tip = toNumberOrNull(obj.tip ?? obj.gratuity)
  const total = toNumberOrNull(
    obj.total ?? obj.grandTotal ?? obj.grand_total ?? obj.amountDue ?? obj.amount_due,
  )

  return { merchant, items, subtotal, tax, tip, total }
}
