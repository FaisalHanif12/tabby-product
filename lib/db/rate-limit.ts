import 'server-only'

import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE_NAME } from './client'

/**
 * Fixed-window rate limiter on the same single-table store — no new infra.
 *
 * Each (scope, identifier, window) gets its own row: `PK=RATE#<scope>`,
 * `SK=<identifier>#<windowIndex>`. A window's requests all land on the same
 * row, so counting is one atomic `ADD` (no read-modify-write, so concurrent
 * requests can't under-count each other). Rows self-expire via the table's
 * existing `ttl` attribute — nothing to clean up.
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export async function checkRateLimit(opts: {
  scope: string
  identifier: string
  limit: number
  windowSeconds: number
}): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = opts.windowSeconds * 1000
  const windowIndex = Math.floor(now / windowMs)
  const resetAt = (windowIndex + 1) * windowMs
  const ttl = Math.ceil(resetAt / 1000) + 60 // small buffer past window end

  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `RATE#${opts.scope}`, SK: `${opts.identifier}#${windowIndex}` },
      UpdateExpression: 'ADD hits :one SET #ttl = if_not_exists(#ttl, :ttl)',
      ExpressionAttributeNames: { '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':one': 1, ':ttl': ttl },
      ReturnValues: 'UPDATED_NEW',
    }),
  )

  const hits = (res.Attributes?.hits as number | undefined) ?? 1
  return {
    allowed: hits <= opts.limit,
    remaining: Math.max(0, opts.limit - hits),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  }
}
