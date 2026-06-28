/**
 * Single-table key builders for the Tabby DynamoDB table.
 *
 *   Session meta : PK=GROUP#<id>  SK=META
 *   Member       : PK=GROUP#<id>  SK=MEMBER#<memberId>
 *   Expense      : PK=GROUP#<id>  SK=EXPENSE#<expenseId>
 *   Line item    : PK=GROUP#<id>  SK=ITEM#<expenseId>#<itemId>
 *   Settlement   : PK=GROUP#<id>  SK=SETTLEMENT#<ts>
 *   User→split   : PK=GROUP#<id>  SK=USERLINK#<userId>   (also indexed on GSI1)
 *   User profile : PK=USER#<userId>  SK=PROFILE
 *
 * A single Query on PK=GROUP#<id> returns every row for a session.
 *
 * GSI1 (optional auth feature — see the terraform GSI1 placeholder): user→history.
 *   GSI1PK=USER#<userId>  GSI1SK=<paddedCreatedAt>#<sessionId>
 * Querying GSI1 by GSI1PK=USER#<userId> (newest first) lists a signed-in user's
 * past splits without scanning. Only USERLINK rows carry the GSI1 attributes.
 */

export const pk = (sessionId: string) => `GROUP#${sessionId}` as const

/** Partition for a signed-in user's own records (profile, etc.). */
export const userPk = (userId: string) => `USER#${userId}` as const

/** GSI1 partition value placed on a USERLINK row so the user can query it. */
export const gsi1Pk = (userId: string) => `USER#${userId}` as const

/**
 * GSI1 sort value: zero-padded creation time so lexical order == chronological
 * order, suffixed with the session id for uniqueness. Query newest-first with
 * ScanIndexForward=false.
 */
export const gsi1Sk = (createdAt: number, sessionId: string) =>
  `${String(createdAt).padStart(15, '0')}#${sessionId}` as const

export const sk = {
  meta: () => 'META' as const,
  member: (memberId: string) => `MEMBER#${memberId}` as const,
  expense: (expenseId: string) => `EXPENSE#${expenseId}` as const,
  item: (expenseId: string, itemId: string) =>
    `ITEM#${expenseId}#${itemId}` as const,
  settlement: (ts: number | string) => `SETTLEMENT#${ts}` as const,
  userLink: (userId: string) => `USERLINK#${userId}` as const,
  profile: () => 'PROFILE' as const,
}

/** SK prefixes used for begins_with filtering when querying a subset. */
export const skPrefix = {
  member: 'MEMBER#',
  expense: 'EXPENSE#',
  item: 'ITEM#',
  settlement: 'SETTLEMENT#',
  userLink: 'USERLINK#',
}

/** Index + attribute names for the user→history GSI. */
export const GSI1_NAME = 'GSI1'
export const GSI1_PK = 'GSI1PK'
export const GSI1_SK = 'GSI1SK'

export const groupKey = (sessionId: string, sortKey: string) => ({
  PK: pk(sessionId),
  SK: sortKey,
})

export const userKey = (userId: string, sortKey: string) => ({
  PK: userPk(userId),
  SK: sortKey,
})
