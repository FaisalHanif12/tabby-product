import 'server-only'

import { getHostCookie } from './cookies'
import { getHostToken } from '@/lib/db/repository'

/**
 * True when the caller holds the opaque host token for this session.
 * Used to gate host-only writes (creating the expense, recording settlement).
 */
export async function isSessionHost(sessionId: string): Promise<boolean> {
  const [cookieToken, storedToken] = await Promise.all([
    getHostCookie(sessionId),
    getHostToken(sessionId),
  ])
  return Boolean(cookieToken && storedToken && cookieToken === storedToken)
}
