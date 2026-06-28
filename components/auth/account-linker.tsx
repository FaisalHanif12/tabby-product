'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { clerkEnabled } from '@/lib/auth/clerk-flags'
import { loadActiveSession } from '@/lib/session-store'
import { linkGuestSessions } from '@/lib/api/tabby-client'

/**
 * Invisible. Watches for a sign-in and links the browser's guest splits to the
 * new account exactly once per user. We pass the CURRENT active split (from
 * session-store) explicitly so a just-finished split is captured even if its
 * cookie hasn't been read yet; the server additionally sweeps the browser's
 * tabby_member_* cookies for recent splits. Idempotent on the server.
 */
export function AccountLinker() {
  if (!clerkEnabled) return null
  return <AccountLinkerInner />
}

function AccountLinkerInner() {
  const { isSignedIn, userId } = useAuth()
  const linkedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!isSignedIn || !userId) return
    if (linkedFor.current === userId) return
    linkedFor.current = userId

    const active = loadActiveSession()
    const links = active
      ? [{ sessionId: active.sessionId, memberId: active.meId }]
      : []
    void linkGuestSessions(links)
  }, [isSignedIn, userId])

  return null
}
