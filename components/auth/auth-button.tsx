'use client'

import { Clock, UserRound } from 'lucide-react'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { clerkEnabled } from '@/lib/auth/clerk-flags'

/**
 * Header auth affordance. Signed-out users get a subtle "Sign in" link; signed-in
 * users get their Clerk avatar menu with History + Profile links. Renders nothing
 * when Clerk isn't configured — the anonymous header is unchanged.
 */
export function AuthButton() {
  if (!clerkEnabled) return null
  return <AuthButtonInner />
}

function AuthButtonInner() {
  const { isLoaded, isSignedIn } = useUser()
  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          className="rounded-full px-3 py-1 font-mono text-xs text-receipt/80 underline-offset-2 transition-colors hover:text-receipt hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
        >
          Sign in
        </button>
      </SignInButton>
    )
  }

  return (
    <UserButton appearance={{ elements: { avatarBox: 'h-7 w-7' } }}>
      <UserButton.MenuItems>
        <UserButton.Link
          label="History"
          labelIcon={<Clock className="h-4 w-4" />}
          href="/history"
        />
        <UserButton.Link
          label="Profile"
          labelIcon={<UserRound className="h-4 w-4" />}
          href="/profile"
        />
      </UserButton.MenuItems>
    </UserButton>
  )
}
