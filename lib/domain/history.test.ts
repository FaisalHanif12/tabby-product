import { describe, it, expect } from 'vitest'
import { mapLinkToHistory, sortHistoryNewestFirst, settleHref } from './history'
import { paymentLink, normalizeUsername } from './payment-links'
import type { UserSplitLink } from '@/lib/types/tabby'

const link = (over: Partial<UserSplitLink> = {}): UserSplitLink => ({
  userId: 'user_1',
  sessionId: 'sess_abc',
  memberId: 'mem_1',
  createdAt: 1000,
  merchant: 'El Camino',
  total: 50,
  share: 12.5,
  status: 'settled',
  ...over,
})

describe('mapLinkToHistory', () => {
  it('prefers live facts over the stored snapshot', () => {
    const entry = mapLinkToHistory(link(), {
      merchant: 'El Camino Cantina',
      total: 70.12,
      share: 18.3,
      status: 'open',
    })
    expect(entry.title).toBe('El Camino Cantina')
    expect(entry.total).toBeCloseTo(70.12, 2)
    expect(entry.yourShare).toBeCloseTo(18.3, 2)
    expect(entry.status).toBe('open')
    expect(entry.href).toContain('s=sess_abc')
    expect(entry.href).toContain('m=mem_1')
  })

  it('falls back to the snapshot when the session is gone (TTL-expired)', () => {
    const entry = mapLinkToHistory(link(), null)
    expect(entry.title).toBe('El Camino')
    expect(entry.total).toBe(50)
    expect(entry.yourShare).toBe(12.5)
    expect(entry.status).toBe('settled')
  })

  it('shows a placeholder title when there is no merchant anywhere', () => {
    const entry = mapLinkToHistory(link({ merchant: null }), null)
    expect(entry.title).toBe('Untitled split')
  })
})

describe('sortHistoryNewestFirst', () => {
  it('orders by createdAt descending', () => {
    const a = mapLinkToHistory(link({ sessionId: 'a', createdAt: 1 }), null)
    const b = mapLinkToHistory(link({ sessionId: 'b', createdAt: 3 }), null)
    const c = mapLinkToHistory(link({ sessionId: 'c', createdAt: 2 }), null)
    expect(sortHistoryNewestFirst([a, b, c]).map((e) => e.sessionId)).toEqual([
      'b',
      'c',
      'a',
    ])
  })
})

describe('settleHref', () => {
  it('encodes session + member into a settle deep link', () => {
    expect(settleHref('s 1', 'm/1')).toBe('/?screen=settle&s=s%201&m=m%2F1')
  })
})

describe('payment-links', () => {
  it('strips @ and $ prefixes from usernames', () => {
    expect(normalizeUsername('@jane-doe')).toBe('jane-doe')
    expect(normalizeUsername('$Cashtag')).toBe('Cashtag')
    expect(normalizeUsername('  plain ')).toBe('plain')
  })

  it('builds Venmo links with amount + note', () => {
    const url = paymentLink({ provider: 'venmo', username: '@jane' }, 12.5, 'Dinner')
    expect(url).toBe(
      'https://venmo.com/jane?txn=pay&amount=12.50&note=Dinner',
    )
  })

  it('builds Cash App links', () => {
    expect(paymentLink({ provider: 'cashapp', username: 'jane' }, 8)).toBe(
      'https://cash.app/$jane/8.00',
    )
  })

  it('builds PayPal links', () => {
    expect(paymentLink({ provider: 'paypal', username: 'jane' }, 9.999)).toBe(
      'https://paypal.me/jane/10.00',
    )
  })

  it('returns null for an empty username', () => {
    expect(paymentLink({ provider: 'venmo', username: '@' }, 5)).toBeNull()
  })
})
