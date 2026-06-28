'use client'

import { Bookmark } from 'lucide-react'
import { SignInButton, useUser } from '@clerk/nextjs'
import { clerkEnabled } from '@/lib/auth/clerk-flags'

/**
 * Low-pressure "save this split" nudge on the all-settled screen. Only shows to
 * signed-OUT users (and only when Clerk is configured). On sign-in, AccountLinker
 * ties the just-finished split — the current active session — to the new account.
 */
export function SaveSplitPrompt() {
  if (!clerkEnabled) return null
  return <SaveSplitPromptInner />
}

function SaveSplitPromptInner() {
  const { isLoaded, isSignedIn } = useUser()
  if (!isLoaded || isSignedIn) return null

  return (
    <div className="mt-6 w-full rounded-2xl border border-hairline bg-receipt px-5 py-4 text-left shadow-[0_12px_28px_-20px_rgba(11,83,65,0.35)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tangerine/15 text-tangerine">
          <Bookmark className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Save this split to your history
          </p>
          <p className="mt-0.5 text-xs text-muted-ink">
            Sign in to keep a record of who paid — no account needed to split.
          </p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="mt-3 rounded-full bg-spruce px-4 py-2 text-sm font-semibold text-receipt transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
            >
              Sign in to save
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  )
}
