import { describe, it, expect } from 'vitest'
import { reconcileSelfClaims, allClaimedBy, type ClaimItem } from './claims'

const item = (id: string, claimedBy: string[]): ClaimItem => ({
  id,
  label: id,
  price: 1,
  claimedBy,
})

describe('reconcileSelfClaims', () => {
  it('passes server data through untouched when there are no pending intentions', () => {
    const server = [item('a', ['maya']), item('b', [])]
    const { items, settled } = reconcileSelfClaims(server, new Map(), 'me')
    expect(items).toEqual(server)
    expect(settled).toEqual([])
  })

  it('protects a pending claim the server has not caught up to yet', () => {
    // We tapped "a" (want claimed) but the poll still shows it unclaimed by us.
    const server = [item('a', ['maya'])]
    const pending = new Map([['a', true]])
    const { items, settled } = reconcileSelfClaims(server, pending, 'me')
    expect(items[0].claimedBy).toEqual(['maya', 'me'])
    expect(settled).toEqual([]) // still pending
  })

  it('protects a pending UNCLAIM the server has not caught up to yet', () => {
    const server = [item('a', ['maya', 'me'])]
    const pending = new Map([['a', false]])
    const { items } = reconcileSelfClaims(server, pending, 'me')
    expect(items[0].claimedBy).toEqual(['maya'])
  })

  it('clears a pending intention once the server agrees', () => {
    const server = [item('a', ['maya', 'me'])]
    const pending = new Map([['a', true]])
    const { items, settled } = reconcileSelfClaims(server, pending, 'me')
    expect(items[0].claimedBy).toEqual(['maya', 'me'])
    expect(settled).toEqual(['a'])
  })

  it('never disturbs other members’ claims', () => {
    const server = [item('a', ['maya', 'theo'])]
    const pending = new Map([['a', true]])
    const { items } = reconcileSelfClaims(server, pending, 'me')
    expect(items[0].claimedBy).toEqual(['maya', 'theo', 'me'])
  })
})

describe('allClaimedBy', () => {
  it('is true only when every item is claimed by self', () => {
    expect(allClaimedBy([item('a', ['me']), item('b', ['me'])], 'me')).toBe(true)
    expect(allClaimedBy([item('a', ['me']), item('b', [])], 'me')).toBe(false)
    expect(allClaimedBy([], 'me')).toBe(false)
  })
})
