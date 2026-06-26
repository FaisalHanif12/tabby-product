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

export function SettleScreen() {
  const [rows, setRows] = useState<SettleRow[]>(INITIAL_SETTLE)
  const [copied, setCopied] = useState(false)

  const outstanding = rows
    .filter((r) => !r.paid)
    .reduce((s, r) => s + r.amount, 0)

  function markPaid(id: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.member.id === id ? { ...r, paid: !r.paid } : r,
      ),
    )
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

  return (
    <div className="px-5 pb-28 pt-6">
      <h1 className="font-heading text-2xl font-bold text-receipt">
        Settle up
      </h1>
      <p className="mt-1 text-sm text-receipt/70">
        You covered {MERCHANT.name}. Here&apos;s who owes you.
      </p>

      <div className="mt-5 rounded-2xl bg-receipt/10 px-5 py-4">
        <span className="text-xs text-receipt/60">Still owed to you</span>
        <div className="font-mono text-3xl font-bold tabular-nums text-receipt">
          {formatMoney(outstanding)}
        </div>
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.member.id}
            className="flex items-center gap-3 rounded-2xl bg-receipt px-4 py-3.5 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.4)]"
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
        onClick={copySummary}
        className={cn(
          'mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-receipt/30 px-5 py-3.5 font-semibold text-receipt transition-colors hover:bg-receipt/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine',
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
