import { describe, it, expect } from 'vitest'
import { extractReceiptJson } from './receipt-parse'
import { ReceiptSchema } from '../validation/schemas'

describe('extractReceiptJson', () => {
  const obj = {
    merchant: 'Café Olé',
    items: [{ label: 'Café con leche', qty: 2, unitPrice: 2.5 }],
    subtotal: 5,
    tax: null,
    tip: null,
    total: 5,
  }

  it('parses plain JSON', () => {
    expect(extractReceiptJson(JSON.stringify(obj))).toEqual(obj)
  })

  it('parses JSON wrapped in a ```json code fence', () => {
    const wrapped = '```json\n' + JSON.stringify(obj) + '\n```'
    expect(extractReceiptJson(wrapped)).toEqual(obj)
  })

  it('parses JSON with leading/trailing prose', () => {
    const noisy = `Sure! Here is the receipt:\n${JSON.stringify(obj)}\nLet me know if you need anything else.`
    expect(extractReceiptJson(noisy)).toEqual(obj)
  })

  it('handles braces inside string values', () => {
    const tricky = { merchant: 'A {weird} name', items: [], subtotal: null, tax: null, tip: null, total: null }
    expect(extractReceiptJson('noise ' + JSON.stringify(tricky))).toEqual(tricky)
  })

  it('returns null when there is no JSON', () => {
    expect(extractReceiptJson('I could not read the receipt.')).toBeNull()
  })

  it('output validates against ReceiptSchema (qty default applied)', () => {
    // Model omitted qty on one line — schema default should fill it to 1.
    const raw = extractReceiptJson(
      '{"merchant":"Shop","items":[{"label":"Milk","unitPrice":1.99}],"subtotal":1.99,"tax":null,"tip":null,"total":1.99}',
    )
    const parsed = ReceiptSchema.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.items[0].qty).toBe(1)
  })
})
