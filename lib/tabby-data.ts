export type Member = {
  id: string
  name: string
  initials: string
  /** Tailwind-friendly background token, e.g. "var(--color-tangerine)" */
  color: string
}

export type LineItem = {
  id: string
  label: string
  price: number
  /** member ids who claimed this item */
  claimedBy: string[]
}

export const MEMBERS: Member[] = [
  { id: 'you', name: 'You', initials: 'YO', color: 'var(--color-tangerine)' },
  { id: 'maya', name: 'Maya', initials: 'MA', color: 'var(--color-avatar-teal)' },
  { id: 'theo', name: 'Theo', initials: 'TH', color: 'var(--color-avatar-clay)' },
  { id: 'dana', name: 'Dana', initials: 'DA', color: 'var(--color-avatar-gold)' },
]

export const MEMBER_MAP: Record<string, Member> = Object.fromEntries(
  MEMBERS.map((m) => [m.id, m]),
)

export const MERCHANT = {
  name: 'El Camino Cantina',
  date: 'Sat, Jun 21 · 8:24 PM',
}

/** The person who started the split (the host). */
export const HOST_NAME = 'Faisal'

/** Mock share link surfaced in the invite sheet / join screen. */
export const SHARE_LINK = 'tabby.split/el-camino-9fk2'

/** People who have already joined the session (shown in the invite sheet). */
export const JOINED_MEMBERS: Member[] = [MEMBER_MAP.maya, MEMBER_MAP.theo]

/** Initial claim-screen items. "Guac & Chips" starts shared by Maya & Theo. */
export const INITIAL_ITEMS: LineItem[] = [
  { id: 'i1', label: 'Carne Asada Burrito', price: 12.5, claimedBy: [] },
  { id: 'i2', label: 'Guac & Chips', price: 9.0, claimedBy: ['maya', 'theo'] },
  { id: 'i3', label: 'Margarita', price: 11.0, claimedBy: ['maya'] },
  { id: 'i4', label: 'Al Pastor Tacos', price: 11.0, claimedBy: ['theo'] },
  { id: 'i5', label: 'Churros', price: 7.5, claimedBy: [] },
  { id: 'i6', label: 'Horchata', price: 4.5, claimedBy: ['dana'] },
]

export const TAX_RATE = 0.085
export const TIP_RATE = 0.18

export function subtotalOf(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.price, 0)
}

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`
}

/** A person's share of an item = price split evenly across everyone who claimed it. */
export function shareForMember(item: LineItem, memberId: string): number {
  if (!item.claimedBy.includes(memberId) || item.claimedBy.length === 0) return 0
  return item.price / item.claimedBy.length
}

/** Mock parsed receipt used by the Capture & Review screen. */
export const PARSED_ITEMS: Omit<LineItem, 'claimedBy'>[] = [
  { id: 'p1', label: 'Carne Asada Burrito', price: 12.5 },
  { id: 'p2', label: 'Guac & Chips', price: 9.0 },
  { id: 'p3', label: 'Margarita', price: 11.0 },
  { id: 'p4', label: 'Al Pastor Tacos', price: 11.0 },
  { id: 'p5', label: 'Churros', price: 7.5 },
]

export type SettleRow = {
  member: Member
  amount: number
  paid: boolean
}

/** Mock settle-up state: You are the payer; everyone owes you. */
export const INITIAL_SETTLE: SettleRow[] = [
  { member: MEMBER_MAP.maya, amount: 24.6, paid: false },
  { member: MEMBER_MAP.theo, amount: 18.3, paid: false },
  { member: MEMBER_MAP.dana, amount: 9.75, paid: true },
]
