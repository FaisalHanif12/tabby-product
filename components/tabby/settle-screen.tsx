'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  INITIAL_SETTLE,
  MERCHANT,
  formatMoney,
  type SettleRow,
} from '@/lib/tabby-data'

export function SettleScreen({ onNewSplit }: { onNewSplit: () => void }) {
  const [rows, setRows] = useState<SettleRow[]>(INITIAL_SETTLE)
  const [copied, setCopied] = useState(false)

  const outstanding = rows
    .filter((r) => !r.paid)
    .reduce((s, r) => s + r.amount, 0)

  const owedTotal = rows.reduce((s, r) => s + r.amount, 0)
  const collected = owedTotal - outstanding

  const allSettled = rows.length > 0 && rows.every((r) => r.paid)

  function markPaid(id: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.member.id === id ? { ...r, paid: !r.paid } : r,
      ),
    )
  }

  function settleAndLock() {
    setRows((prev) => prev.map((r) => ({ ...r, paid: true })))
  }

  function copySummary() {
    const lines = rows.map(
      (r) =>
        `${r.member.name} owes you ${formatMoney(r.amount)}${
          r.paid ? ' (paid)' : ''
        }`,
    )
    const text = `Tabby · ${MERCHANT.name}\n${lines.join('\n')}`
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (allSettled) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 pb-8 pt-10 text-center motion-safe:animate-rise">
        <div className="relative flex h-28 w-28 items-center justify-center motion-safe:animate-pop">
          <span className="ping-soft absolute inset-0 rounded-full bg-mint" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-mint shadow-[0_18px_40px_-16px_rgba(111,224,172,0.9)]">
            <Check className="h-12 w-12 text-ink" strokeWidth={3} />
          </span>
        </div>

        <h1 className="mt-7 font-heading text-3xl font-extrabold tracking-tight text-ink">
          All settled up!
        </h1>
        <p className="mt-2 text-pretty text-base leading-relaxed text-muted-ink">
          Everyone&apos;s paid up for{' '}
          <span className="font-semibold text-ink">{MERCHANT.name}</span>.
          Nice work.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-mint/30 px-3 py-1 text-xs font-semibold text-spruce">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Settled — locked
        </span>

        <button
          type="button"
          onClick={onNewSplit}
          className="mt-8 w-full rounded-full bg-tangerine px-7 py-4 text-base font-semibold text-ink shadow-[0_14px_30px_-12px_rgba(255,138,43,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Start a new split
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 pb-6 pt-4">
      <h1 className="font-heading text-2xl font-bold text-ink">
        Settle up
      </h1>
      <p className="mt-1 text-sm text-muted-ink">
        You covered {MERCHANT.name}. Here&apos;s who owes you.
      </p>

      <div className="mt-5 rounded-2xl bg-spruce px-5 py-4 shadow-[0_16px_40px_-22px_rgba(11,83,65,0.55)]">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs text-receipt/70">Still owed to you</span>
            <div className="font-mono text-3xl font-bold tabular-nums text-receipt">
              {formatMoney(outstanding)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-receipt/60">You paid upfront</span>
            <div className="font-mono text-base font-semibold tabular-nums text-mint">
              {formatMoney(owedTotal)}
            </div>
          </div>
        </div>
        {/* collection progress — how much has come back so far */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-spruce-dark">
          <div
            className="h-full rounded-full bg-mint transition-all duration-500"
            style={{
              width: `${owedTotal ? Math.round((collected / owedTotal) * 100) : 0}%`,
            }}
          />
        </div>
        <p className="mt-2 text-[11px] text-receipt/60">
          {formatMoney(collected)} collected of {formatMoney(owedTotal)}
        </p>
      </div>

      <p className="mt-6 px-1 text-xs font-semibold uppercase tracking-wide text-muted-ink">
        Each person&apos;s share
      </p>

      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.member.id}
            className="flex items-center gap-3 rounded-2xl border border-hairline bg-receipt px-4 py-3.5 shadow-[0_12px_28px_-20px_rgba(11,83,65,0.35)]"
          >
            <span
              style={{ backgroundColor: row.member.color }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold text-ink"
            >
              {row.member.initials}
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">
                {row.member.name}
                <span className="text-muted-ink"> owes you</span>
              </p>
              <p className="font-mono text-lg font-semibold tabular-nums text-ink">
                {formatMoney(row.amount)}
              </p>
            </div>

            {row.paid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-sm font-semibold text-ink">
                <Check className="h-4 w-4" strokeWidth={3} />
                Settled
              </span>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  className="rounded-full bg-tangerine px-4 py-2 text-sm font-semibold text-ink transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-receipt"
                >
                  Pay with Venmo
                </button>
                <button
                  type="button"
                  onClick={() => markPaid(row.member.id)}
                  className="text-xs font-medium text-muted-ink underline-offset-2 hover:underline"
                >
                  Mark as paid
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={settleAndLock}
        className="mt-6 w-full rounded-full bg-spruce px-7 py-4 text-base font-semibold text-receipt shadow-[0_14px_30px_-14px_rgba(11,83,65,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        Settle &amp; lock
      </button>

      <button
        type="button"
        onClick={copySummary}
        className={cn(
          'mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-hairline bg-receipt px-5 py-3.5 font-semibold text-ink shadow-[0_10px_24px_-18px_rgba(11,83,65,0.4)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine',
        )}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Copied summary
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy summary
          </>
        )}
      </button>
    </div>
  )
}
