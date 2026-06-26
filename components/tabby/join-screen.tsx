'use client'

import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { HOST_NAME, JOINED_MEMBERS, MERCHANT } from '@/lib/tabby-data'

export function JoinScreen({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('')
  const canJoin = name.trim().length > 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (canJoin) onJoin(name.trim())
  }

  return (
    <div className="flex min-h-full flex-col px-6 pb-8 pt-10">
      <div className="flex flex-1 flex-col justify-center">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-hairline bg-receipt px-3 py-1 text-xs font-semibold text-spruce">
          <Sparkles className="h-3.5 w-3.5 text-tangerine" />
          You&apos;re invited
        </span>

        <div className="mt-5 rounded-3xl border border-hairline bg-receipt p-6 shadow-[0_16px_40px_-20px_rgba(11,83,65,0.3)]">
          <div className="flex -space-x-2">
            {JOINED_MEMBERS.map((m) => (
              <span
                key={m.id}
                style={{ backgroundColor: m.color }}
                className="flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-semibold text-ink ring-2 ring-receipt"
              >
                {m.initials}
              </span>
            ))}
          </div>

          <h1 className="mt-4 text-balance font-heading text-2xl font-bold leading-snug text-ink">
            {HOST_NAME} invited you to split{' '}
            <span className="text-tangerine">{MERCHANT.name}</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-ink">
            {JOINED_MEMBERS.length} people are already in. Add your name to claim
            your items.
          </p>

          <form onSubmit={submit} className="mt-6">
            <label
              htmlFor="join-name"
              className="text-sm font-medium text-ink"
            >
              Your name
            </label>
            <input
              id="join-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              autoComplete="given-name"
              className="mt-2 min-h-[52px] w-full rounded-2xl border border-hairline bg-secondary px-4 py-3 text-base font-medium text-ink outline-none transition-colors focus:border-tangerine"
            />

            <button
              type="submit"
              disabled={!canJoin}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-tangerine px-7 py-4 text-base font-semibold text-ink shadow-[0_14px_30px_-12px_rgba(255,138,43,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              Join the split
              <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-ink">
          No account needed.
        </p>
      </div>
    </div>
  )
}
