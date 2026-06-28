'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SignInButton, useUser } from '@clerk/nextjs'
import { Clock } from 'lucide-react'
import { clerkEnabled } from '@/lib/auth/clerk-flags'
import {
  AccountScreenFrame,
  SignedOutNotice,
} from '@/components/auth/account-screen-frame'
import { getMyHistory } from '@/lib/api/tabby-client'
import { formatMoney } from '@/lib/tabby-data'
import type { HistoryEntry } from '@/lib/types/tabby'

export default function HistoryPage() {
  return (
    <AccountScreenFrame title="Your splits">
      {!clerkEnabled ? (
        <SignedOutNotice message="History needs sign-in, which isn't configured here." />
      ) : (
        <HistoryGate />
      )}
    </AccountScreenFrame>
  )
}

function HistoryGate() {
  const { isLoaded, isSignedIn } = useUser()
  if (!isLoaded) {
    return <p className="mt-6 text-sm text-muted-ink">Loading…</p>
  }
  if (!isSignedIn) {
    return (
      <div className="mt-4">
        <SignedOutNotice message="Sign in to see your saved splits." />
        <SignInButton mode="modal">
          <button
            type="button"
            className="mt-4 rounded-full bg-tangerine px-5 py-2.5 text-sm font-semibold text-ink"
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    )
  }
  return <HistoryList />
}

const STATUS_LABEL: Record<HistoryEntry['status'], string> = {
  open: 'Open',
  expensed: 'Claiming',
  settled: 'Settled',
}

function HistoryList() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void getMyHistory().then((res) => {
      if (cancelled) return
      setEntries(res.ok ? res.data.entries : [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (entries === null) {
    return <p className="mt-6 text-sm text-muted-ink">Loading your splits…</p>
  }

  if (entries.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-spruce/10 text-spruce">
          <Clock className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-ink">No splits yet</p>
        <p className="mt-1 text-sm text-muted-ink">
          Splits you create or join will show up here.
        </p>
        <Link
          href="/?screen=capture"
          className="mt-5 rounded-full bg-tangerine px-5 py-2.5 text-sm font-semibold text-ink"
        >
          Start a split
        </Link>
      </div>
    )
  }

  return (
    <ul className="mt-5 flex flex-col gap-3">
      {entries.map((e) => (
        <li key={e.sessionId}>
          <Link
            href={e.href}
            className="block rounded-2xl border border-hairline bg-receipt px-4 py-3.5 shadow-[0_12px_28px_-20px_rgba(11,83,65,0.35)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{e.title}</p>
                <p className="mt-0.5 text-xs text-muted-ink">
                  {new Date(e.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold tabular-nums text-ink">
                  {formatMoney(e.yourShare)}
                </p>
                <p className="font-mono text-[11px] text-muted-ink">
                  of {formatMoney(e.total)}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <span
                className={
                  e.status === 'settled'
                    ? 'inline-flex items-center rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-semibold text-ink'
                    : 'inline-flex items-center rounded-full bg-leader/40 px-2.5 py-0.5 text-[11px] font-semibold text-muted-ink'
                }
              >
                {STATUS_LABEL[e.status]}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
