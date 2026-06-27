/**
 * Single-table key builders for the Tabby DynamoDB table.
 *
 *   Session meta : PK=GROUP#<id>  SK=META
 *   Member       : PK=GROUP#<id>  SK=MEMBER#<memberId>
 *   Expense      : PK=GROUP#<id>  SK=EXPENSE#<expenseId>
 *   Line item    : PK=GROUP#<id>  SK=ITEM#<expenseId>#<itemId>
 *   Settlement   : PK=GROUP#<id>  SK=SETTLEMENT#<ts>
 *
 * A single Query on PK=GROUP#<id> returns every row for a session.
 */

export const pk = (sessionId: string) => `GROUP#${sessionId}` as const

export const sk = {
  meta: () => 'META' as const,
  member: (memberId: string) => `MEMBER#${memberId}` as const,
  expense: (expenseId: string) => `EXPENSE#${expenseId}` as const,
  item: (expenseId: string, itemId: string) =>
    `ITEM#${expenseId}#${itemId}` as const,
  settlement: (ts: number | string) => `SETTLEMENT#${ts}` as const,
}

/** SK prefixes used for begins_with filtering when querying a subset. */
export const skPrefix = {
  member: 'MEMBER#',
  expense: 'EXPENSE#',
  item: 'ITEM#',
  settlement: 'SETTLEMENT#',
}

export const groupKey = (sessionId: string, sortKey: string) => ({
  PK: pk(sessionId),
  SK: sortKey,
})
