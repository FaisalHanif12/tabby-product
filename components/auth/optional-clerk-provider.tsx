'use client'

import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { clerkEnabled } from '@/lib/auth/clerk-flags'

/**
 * Clerk modal/card appearance — keep the sign-in card phone-sized so it sits
 * inside Tabby's 390px mobile frame instead of spilling across the viewport,
 * and tint it with the brand spruce. Element keys come from Clerk's appearance
 * API; `max-w-[var]` arbitrary classes are emitted by Tailwind from this source.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: '#0B5341',
    borderRadius: '0.75rem',
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  },
}

/**
 * Wraps the app in ClerkProvider ONLY when Clerk is configured. With no CLERK_*
 * env vars this renders children untouched, so the anonymous app never depends
 * on Clerk being present (no hard crash in dev / preview).
 */
export function OptionalClerkProvider({ children }: { children: ReactNode }) {
  if (!clerkEnabled) return <>{children}</>
  return (
    <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
  )
}
