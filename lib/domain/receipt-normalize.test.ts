import { describe, it, expect } from 'vitest'
import { normalizeReceipt, toNumberOrNull } from './receipt-normalize'

describe('toNumberOrNull', () => {
  it('passes through finite numbers', () => {
    expect(toNumberOrNull(12.5)).toBe(12.5)
    expect(toNumberOrNull(0)).toBe(0)
  })
  it('parses plain numeric strings', () => {
    expect(toNumberOrNull('12.50')).toBe(12.5)
  })
  it('strips currency symbols and spaces', () => {
    expect(toNumberOrNull('$12.50')).toBe(12.5)
    expect(toNumberOrNull('Rs 1,200.00')).toBe(1200)
    expect(toNumberOrNull('₨ 350')).toBe(350)
  })
  it('handles European decimal commas', () => {
    expect(toNumberOrNull('12,50')).toBe(12.5)
    expect(toNumberOrNull('1.234,56')).toBe(1234.56)
  })
  it('returns null for non-numeric junk', () => {
    expect(toNumberOrNull('N/A')).toBeNull()
    expect(toNumberOrNull(null)).toBeNull()
    expect(toNumberOrNull(undefined)).toBeNull()
  })
})

describe('normalizeReceipt', () => {
  it('coerces string prices that strict Zod would have rejected', () => {
    const r = normalizeReceipt({
      merchant: 'Joe’s Diner',
      items: [{ label: 'Burger', qty: '2', unitPrice: '$6.25' }],
      subtotal: '12.50',
      tax: '1.00',
      tip: null,
      total: '13.50',
    })
    expect(r.merchant).toBe('Joe’s Diner')
    expect(r.items).toEqual([{ label: 'Burger', qty: 2, unitPrice: 6.25 }])
    expect(r.subtotal).toBe(12.5)
    expect(r.tax).toBe(1)
    expect(r.tip).toBeNull()
    expect(r.total).toBe(13.5)
  })

  it('defaults missing qty to 1 and derives unitPrice from a line total', () => {
    const r = normalizeReceipt({
      items: [{ name: 'Milk', price: 3.98, quantity: 2 }], // name + price + quantity aliases
    })
    expect(r.items[0]).toEqual({ label: 'Milk', qty: 2, unitPrice: 1.99 })
  })

  it('accepts alias field names (lineItems, amount, no qty)', () => {
    const r = normalizeReceipt({
      store: 'Mart',
      lineItems: [{ description: 'Soap', amount: '2.49' }],
      grand_total: '2.49',
    })
    expect(r.merchant).toBe('Mart')
    expect(r.items).toEqual([{ label: 'Soap', qty: 1, unitPrice: 2.49 }])
    expect(r.total).toBe(2.49)
  })

  it('drops unusable items but keeps the good ones', () => {
    const r = normalizeReceipt({
      items: [
        { label: 'Coffee', unitPrice: 3 },
        { unitPrice: 5 }, // no label -> dropped
        'garbage', // not an object -> dropped
      ],
    })
    expect(r.items).toEqual([{ label: 'Coffee', qty: 1, unitPrice: 3 }])
  })

  it('never throws on empty / malformed input', () => {
    expect(normalizeReceipt(null).items).toEqual([])
    expect(normalizeReceipt({}).items).toEqual([])
    expect(normalizeReceipt({ items: 'nope' }).items).toEqual([])
  })

  it('keeps non-Latin labels (any language)', () => {
    const r = normalizeReceipt({
      items: [{ label: 'قهوة', unitPrice: 5 }, { label: '寿司', unitPrice: 12 }],
    })
    expect(r.items.map((i) => i.label)).toEqual(['قهوة', '寿司'])
  })
})
