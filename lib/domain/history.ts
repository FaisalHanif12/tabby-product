/**
 * PURE helpers for the signed-in saved-history list — no IO.
 *
 * A USERLINK row stores a denormalized snapshot of a split (merchant, total,
 * the user's share, status). When the underlying session still exists we prefer
 * fresh values; once it has TTL-expired we fall back to the snapshot so history
 * never shows blanks. `mapLinkToHistory` encodes that precedence, and is the
 * unit-tested core of the feature.
 */

import type { HistoryEntry, SessionStatus, UserSplitLink } from '@/lib/types/tabby'

/** Live, freshly-computed values for a split (null when the session is gone). */
export interface LiveSplitFacts {
  merchant: string | null
  total: number
  share: number
  status: SessionStatus
}

/**
 * Deep link back into a split's settle view. Carries the session id and the
 * user's member id so the app can hydrate the right session + identity without
 * relying on this browser's localStorage (history may open on a new device).
 */
export function settleHref(sessionId: string, memberId: string): string {
  return `/?screen=settle&s=${encodeURIComponent(sessionId)}&m=${encodeURIComponent(memberId)}`
}

export function mapLinkToHistory(
  link: UserSplitLink,
  live: LiveSplitFacts | null,
): HistoryEntry {
  const merchant = (live?.merchant ?? link.merchant) || null
  return {
    sessionId: link.sessionId,
    title: merchant || 'Untitled split',
    total: live?.total ?? link.total,
    yourShare: live?.share ?? link.share,
    status: live?.status ?? link.status,
    createdAt: link.createdAt,
    href: settleHref(link.sessionId, link.memberId),
  }
}

/** Newest first. GSI1 already returns this order, but keep it deterministic. */
export function sortHistoryNewestFirst(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt)
}
