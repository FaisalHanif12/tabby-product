import 'server-only'

import { cookies } from 'next/headers'

/**
 * Lightweight per-session identity via httpOnly cookies. No global secret is
 * required: the host token is an opaque random value stored on the session META
 * row and compared on write; the member cookie simply pins a guest to their
 * member id so refreshes don't create duplicates.
 */

const hostCookie = (sessionId: string) => `tabby_host_${sessionId}`
const memberCookie = (sessionId: string) => `tabby_member_${sessionId}`

const baseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
}

export async function setHostCookie(sessionId: string, token: string) {
  const store = await cookies()
  store.set(hostCookie(sessionId), token, baseOptions)
}

export async function getHostCookie(sessionId: string): Promise<string | null> {
  const store = await cookies()
  return store.get(hostCookie(sessionId))?.value ?? null
}

export async function setMemberCookie(sessionId: string, memberId: string) {
  const store = await cookies()
  store.set(memberCookie(sessionId), memberId, baseOptions)
}

export async function getMemberCookie(
  sessionId: string,
): Promise<string | null> {
  const store = await cookies()
  return store.get(memberCookie(sessionId))?.value ?? null
}
