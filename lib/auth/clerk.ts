import 'server-only'

import { clerkEnabled } from './clerk-flags'

/**
 * Server-side current-user id, or null when signed out OR when Clerk isn't
 * configured. Importing `auth` lazily means a build/dev environment with no
 * CLERK_* vars never touches Clerk internals — the new routes simply behave as
 * "signed out" and the anonymous app is unaffected.
 */
export async function getUserId(): Promise<string | null> {
  if (!clerkEnabled || !process.env.CLERK_SECRET_KEY) return null
  try {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    return userId ?? null
  } catch {
    return null
  }
}
