'use client'

import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { clerkEnabled } from '@/lib/auth/clerk-flags'

/**
 * Wraps the app in ClerkProvider ONLY when Clerk is configured. With no CLERK_*
 * env vars this renders children untouched, so the anonymous app never depends
 * on Clerk being present (no hard crash in dev / preview).
 */
export function OptionalClerkProvider({ children }: { children: ReactNode }) {
  if (!clerkEnabled) return <>{children}</>
  return <ClerkProvider>{children}</ClerkProvider>
}
