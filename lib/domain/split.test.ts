import { describe, it, expect } from 'vitest'
import { splitBill } from './split'
import { settleUp } from './settle'

const sumTotals = (perMember: { total: number }[]) =>
  Math.round(perMember.reduce((s, m) => s + m.total, 0) * 100) / 100

describe('splitBill', () => {
  it('splits a shared item evenly and conserves the total to the cent', () => {
    const res = splitBill({
      memberIds: ['a', 'b', 'c'],
      tax: 0,
      tip: 0,
      items: [
        { id: 'i1', price: 10, claimedBy: ['a'] },
        { id: 'i2', price: 9, claimedBy: ['a', 'b', 'c'] }, // 3.00 each
        { id: 'i3', price: 6, claimedBy: ['b', 'c'] }, // 3.00 each
      ],
    })

    const byId = Object.fromEntries(res.perMember.map((m) => [m.memberId, m]))
    expect(byId.a.subtotal).toBeCloseTo(13, 2)
    expect(byId.b.subtotal).toBeCloseTo(6, 2)
    expect(byId.c.subtotal).toBeCloseTo(6, 2)
    expect(res.subtotal).toBeCloseTo(25, 2)
    expect(sumTotals(res.perMember)).toBeCloseTo(res.total, 2)
  })

  it('distributes tax + tip proportionally to claimed subtotal', () => {
    const res = splitBill({
      memberIds: ['a', 'b'],
      tax: 0,
      tip: 10, // a claims $30, b claims $10 -> tip 7.50 / 2.50
      items: [
        { id: 'i1', price: 30, claimedBy: ['a'] },
        { id: 'i2', price: 10, claimedBy: ['b'] },
      ],
    })
    const byId = Object.fromEntries(res.perMember.map((m) => [m.memberId, m]))
    expect(byId.a.tipShare).toBeCloseTo(7.5, 2)
    expect(byId.b.tipShare).toBeCloseTo(2.5, 2)
    expect(sumTotals(res.perMember)).toBeCloseTo(res.total, 2)
  })

  it('handles indivisible cents deterministically (no lost pennies)', () => {
    // $10.00 split 3 ways = 3.34 / 3.33 / 3.33
    const res = splitBill({
      memberIds: ['a', 'b', 'c'],
      tax: 0,
      tip: 0,
      items: [{ id: 'i1', price: 10, claimedBy: ['a', 'b', 'c'] }],
    })
    const totals = res.perMember.map((m) => m.total).sort()
    expect(totals).toEqual([3.33, 3.33, 3.34])
    expect(sumTotals(res.perMember)).toBeCloseTo(10, 2)
  })

  it('splits unclaimed items across all members', () => {
    const res = splitBill({
      memberIds: ['a', 'b'],
      tax: 0,
      tip: 0,
      items: [{ id: 'i1', price: 8, claimedBy: [] }],
    })
    const byId = Object.fromEntries(res.perMember.map((m) => [m.memberId, m]))
    expect(byId.a.subtotal).toBeCloseTo(4, 2)
    expect(byId.b.subtotal).toBeCloseTo(4, 2)
  })

  it('conserves a messy real-world receipt to the cent', () => {
    const res = splitBill({
      memberIds: ['you', 'maya', 'theo', 'dana'],
      tax: 4.69,
      tip: 9.93,
      items: [
        { id: 'i1', price: 12.5, claimedBy: ['you'] },
        { id: 'i2', price: 9.0, claimedBy: ['maya', 'theo'] },
        { id: 'i3', price: 11.0, claimedBy: ['maya'] },
        { id: 'i4', price: 11.0, claimedBy: ['theo'] },
        { id: 'i5', price: 7.5, claimedBy: ['you', 'dana'] },
        { id: 'i6', price: 4.5, claimedBy: ['dana'] },
      ],
    })
    expect(sumTotals(res.perMember)).toBeCloseTo(res.total, 2)
    expect(res.total).toBeCloseTo(55.5 + 4.69 + 9.93, 2)
  })
})

describe('settleUp', () => {
  it('lists every non-payer owing their own total', () => {
    const result = settleUp(
      [
        { memberId: 'you', total: 20 },
        { memberId: 'maya', total: 24.6 },
        { memberId: 'theo', total: 18.3 },
      ],
      'you',
    )
    expect(result.rows).toEqual([
      { memberId: 'maya', amount: 24.6 },
      { memberId: 'theo', amount: 18.3 },
    ])
    expect(result.totalOwed).toBeCloseTo(42.9, 2)
  })

  it('omits the payer and zero-balance members', () => {
    const result = settleUp(
      [
        { memberId: 'you', total: 20 },
        { memberId: 'dana', total: 0 },
      ],
      'you',
    )
    expect(result.rows).toEqual([])
    expect(result.totalOwed).toBe(0)
  })
})
