'use client'

import { useEffect, useState } from 'react'
import { Check, HandCoins } from 'lucide-react'
import { formatMoney, type SettleRow } from '@/lib/tabby-data'
import type { PaymentHandle, SessionView } from '@/lib/types/tabby'
import { getSettlement, settleSession } from '@/lib/api/tabby-client'
import { paymentLink, payButtonLabel } from '@/lib/domain/payment-links'
import { SaveSplitPrompt } from '@/components/auth/save-split-prompt'

export function SettleScreen({
  sessionId = null,
  view = null,
  onNewSplit,
}: {
  sessionId?: string | null
  view?: SessionView | null
  onNewSplit: () => void
}) {
  // Purely live and only once an expense exists (mirrors Claim). Without a real
  // split we show an empty state — and never POST /settle (which would 409).
  const live = Boolean(sessionId && view?.expense)
  const [rows, setRows] = useState<SettleRow[]>([])
  // The payer's saved payment handle (when they're a signed-in user). Prefills
  // every "Pay" deep link; null falls back to the plain button.
  const [payerHandle, setPayerHandle] = useState<PaymentHandle | null>(null)

  const merchantName = view?.expense?.merchant || 'the bill'

  // Live settlement: finalise the split (host-only; guests get 403 and just
  // read), then load the real per-member "who owes the payer" amounts.
  useEffect(() => {
    if (!live || !sessionId) return
    let cancelled = false
    void (async () => {
      await settleSession(sessionId)
      const res = await getSettlement(sessionId)
      if (cancelled || !res.ok || !res.data.settle) return
      setPayerHandle(res.data.payerHandle ?? null)
      const byId = Object.fromEntries(res.data.members.map((m) => [m.id, m]))
      setRows(
        res.data.settle.rows.map((r) => ({
          member: {
            id: r.memberId,
            name: byId[r.memberId]?.name ?? 'Someone',
            initials: byId[r.memberId]?.initials ?? '??',
            color: byId[r.memberId]?.color ?? 'var(--color-tangerine)',
          },
          amount: r.amount,
          paid: false,
        })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [live, sessionId])

  const outstanding = rows
    .filter((r) => !r.paid)
    .reduce((s, r) => s + r.amount, 0)

  const allSettled = rows.length > 0 && rows.every((r) => r.paid)

  function markPaid(id: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.member.id === id ? { ...r, paid: !r.paid } : r,
      ),
    )
  }

  // Feed the lifted SettleFooter (outside the scroll zone) so the action stays
  // pinned at the bottom — same pattern as the Claim footer. The event carries
  // the copy text so the footer needs no back-channel.
  useEffect(() => {
    const lines = rows.map(
      (r) =>
        `${r.member.name} owes you ${formatMoney(r.amount)}${
          r.paid ? ' (paid)' : ''
        }`,
    )
    window.dispatchEvent(
      new CustomEvent('tabby:settle-summary', {
        detail: {
          outstanding,
          text: `Tabby · ${merchantName}\n${lines.join('\n')}`,
          ready: rows.length > 0 && !allSettled,
        },
      }),
    )
  }, [rows, merchantName, outstanding, allSettled])

  // Empty state: no active split to settle yet.
  if (!live) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 pb-10 pt-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-spruce/10 text-spruce">
          <HandCoins className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold text-ink">
          Nothing to settle yet
        </h1>
        <p className="mt-1.5 text-sm text-muted-ink">
          Capture a receipt and claim items — the who-owes-who shows up here.
        </p>
      </div>
    )
  }

  if (allSettled) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 pb-8 pt-10 text-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
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
          <span className="font-semibold text-ink">{merchantName}</span>.
          Nice work.
        </p>

        {/* Low-pressure nudge for signed-out users to save this split. */}
        <SaveSplitPrompt />

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
        You covered {merchantName}. Here&apos;s who owes you.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
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
                {(() => {
                  const href = payerHandle
                    ? paymentLink(
                        payerHandle,
                        row.amount,
                        `Tabby - ${merchantName}`,
                      )
                    : null
                  const className =
                    'rounded-full bg-tangerine px-4 py-2 text-sm font-semibold text-ink transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-receipt'
                  // Prefilled deep link when the payer saved a handle; otherwise
                  // the original plain button (anonymous-friendly fallback).
                  return href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      {payButtonLabel(payerHandle!.provider)}
                    </a>
                  ) : (
                    <button type="button" className={className}>
                      Pay with Venmo
                    </button>
                  )
                })()}
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
    </div>
  )
}
