'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, HandCoins, Lock } from 'lucide-react'
import { formatMoney } from '@/lib/tabby-data'
import type { SessionView } from '@/lib/types/tabby'
import {
  getSettlement,
  settleSession,
  type SettlementView,
} from '@/lib/api/tabby-client'
import { paymentLink, payButtonLabel } from '@/lib/domain/payment-links'
import { SaveSplitPrompt } from '@/components/auth/save-split-prompt'

export function SettleScreen({
  sessionId = null,
  meId = null,
  view = null,
  onNewSplit,
  onRefresh,
}: {
  sessionId?: string | null
  meId?: string | null
  view?: SessionView | null
  onNewSplit: () => void
  onRefresh?: () => void
}) {
  // Purely live and only once an expense exists (mirrors Claim).
  const live = Boolean(sessionId && view?.expense)
  const [data, setData] = useState<SettlementView | null>(null)
  // Local "mark as paid" toggles, keyed by the ower's memberId.
  const [paid, setPaid] = useState<Record<string, boolean>>({})
  const [finalizing, setFinalizing] = useState(false)

  const merchantName = view?.expense?.merchant || 'the bill'
  const isHost = Boolean(view?.members.find((m) => m.id === meId)?.isHost)
  const isSettled = view?.meta?.status === 'settled'
  const version = view?.meta?.version

  // Read-only live preview — opening Settle no longer finalises the split.
  // Re-fetches when the session version changes (a claim or settle).
  useEffect(() => {
    if (!live || !sessionId) return
    let cancelled = false
    void (async () => {
      const res = await getSettlement(sessionId)
      if (cancelled || !res.ok) return
      setData(res.data)
    })()
    return () => {
      cancelled = true
    }
  }, [live, sessionId, version])

  // ── Derive everything from the settlement view ──
  const payerId = data?.payerId ?? null
  const members = useMemo(() => data?.members ?? [], [data])
  const byId = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m] as const)),
    [members],
  )
  const perMember = data?.split?.perMember ?? []
  const owedRows = data?.settle?.rows ?? [] // every non-payer owes the payer
  const payerHandle = data?.payerHandle ?? null
  const total = data?.split?.total ?? view?.expense?.total ?? 0
  const selfIsPayer = meId != null && meId === payerId
  const payerName = (payerId && byId[payerId]?.name) || 'the host'
  const nameOf = (id: string) => byId[id]?.name ?? 'Someone'

  const owedByMe = owedRows.find((r) => r.memberId === meId)?.amount ?? 0
  const myShare =
    perMember.find((m) => m.memberId === meId)?.total ?? owedByMe
  const stillOwedToPayer = owedRows
    .filter((r) => !paid[r.memberId])
    .reduce((s, r) => s + r.amount, 0)
  const allPaid = owedRows.length > 0 && owedRows.every((r) => paid[r.memberId])

  function togglePaid(id: string) {
    setPaid((p) => ({ ...p, [id]: !p[id] }))
  }

  // Host-only: finalise + lock (POST /settle flips status to 'settled').
  function settleAndLock() {
    if (!sessionId || finalizing) return
    setFinalizing(true)
    void settleSession(sessionId).then((res) => {
      setFinalizing(false)
      if (res.ok) onRefresh?.()
    })
  }

  // Feed the pinned bottom footer (label + amount + copy text), perspective-aware.
  useEffect(() => {
    if (!data) return
    const lines = owedRows.map(
      (r) =>
        `${nameOf(r.memberId)} owes ${payerName} ${formatMoney(r.amount)}${
          paid[r.memberId] ? ' (paid)' : ''
        }`,
    )
    const label = selfIsPayer ? 'Still owed to you' : `You owe ${payerName}`
    const amount = selfIsPayer
      ? stillOwedToPayer
      : paid[meId ?? '']
        ? 0
        : owedByMe
    const ready = selfIsPayer
      ? owedRows.length > 0 && stillOwedToPayer > 0
      : owedByMe > 0 && !paid[meId ?? '']
    window.dispatchEvent(
      new CustomEvent('tabby:settle-summary', {
        detail: {
          label,
          amount,
          text: `Tabby · ${merchantName}\n${lines.join('\n')}`,
          ready,
        },
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, paid, selfIsPayer])

  // ── Empty state ──
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

  // ── All paid celebration (payer's view) ──
  if (selfIsPayer && allPaid) {
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
          <span className="font-semibold text-ink">{merchantName}</span>. Nice
          work.
        </p>
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
      <h1 className="font-heading text-2xl font-bold text-ink">Settle up</h1>
      <p className="mt-1 text-sm text-muted-ink">
        {selfIsPayer
          ? `You covered ${merchantName}.`
          : `${payerName} covered ${merchantName}.`}
      </p>

      {isSettled ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-hairline bg-receipt px-4 py-2.5 text-sm font-medium text-muted-ink">
          <Lock className="h-4 w-4 shrink-0 text-spruce" />
          Settled and locked — these amounts are final.
        </div>
      ) : (
        isHost && (
          <button
            type="button"
            onClick={settleAndLock}
            disabled={finalizing}
            className="mt-4 w-full rounded-full bg-spruce px-7 py-3.5 text-base font-semibold text-receipt shadow-[0_14px_30px_-14px_rgba(11,83,65,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine disabled:opacity-60"
          >
            {finalizing ? 'Settling…' : 'Settle & lock'}
          </button>
        )
      )}

      {/* ── Bill total — makes the per-person shares add up to something visible ── */}
      <div className="mt-5 rounded-2xl bg-spruce px-5 py-4 shadow-[0_16px_40px_-22px_rgba(11,83,65,0.55)]">
        <span className="text-xs text-receipt/70">Bill total</span>
        <div className="font-mono text-3xl font-bold tabular-nums text-receipt">
          {formatMoney(total)}
        </div>
        <span className="text-xs text-receipt/70">
          {selfIsPayer ? 'You paid it all upfront' : `${payerName} paid it all upfront`}
        </span>
      </div>

      {/* ── Guest's own "you owe" card with a Pay deep link ── */}
      {!selfIsPayer && owedByMe > 0 && (
        <div className="mt-4 rounded-2xl border border-hairline bg-receipt px-4 py-3.5 shadow-[0_12px_28px_-20px_rgba(11,83,65,0.35)]">
          <p className="text-sm text-muted-ink">
            Your share of {formatMoney(total)}
          </p>
          <p className="font-medium text-ink">
            You owe {payerName}{' '}
            <span className="font-mono font-semibold">
              {formatMoney(owedByMe)}
            </span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <PayAction
              handle={payerHandle}
              amount={owedByMe}
              note={`Tabby - ${merchantName}`}
            />
            <button
              type="button"
              onClick={() => togglePaid(meId ?? '')}
              className="text-xs font-medium text-muted-ink underline-offset-2 hover:underline"
            >
              {paid[meId ?? ''] ? 'Paid ✓' : 'Mark as paid'}
            </button>
          </div>
        </div>
      )}

      {/* ── Everyone's share — transparency: these sum to the total ── */}
      <h3 className="mt-6 text-sm font-semibold text-ink">Each person&apos;s share</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {perMember.map((pm) => {
          const m = byId[pm.memberId]
          const isPayerRow = pm.memberId === payerId
          const isMe = pm.memberId === meId
          const rowPaid = paid[pm.memberId]
          return (
            <li
              key={pm.memberId}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-receipt px-4 py-3.5 shadow-[0_12px_28px_-20px_rgba(11,83,65,0.35)]"
            >
              <span
                style={{ backgroundColor: m?.color ?? 'var(--color-tangerine)' }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold text-ink"
              >
                {m?.initials ?? '??'}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {m?.name ?? 'Someone'}
                  {isMe && <span className="text-muted-ink"> (you)</span>}
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums text-ink">
                  {formatMoney(pm.total)}
                </p>
              </div>

              {isPayerRow ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-sm font-semibold text-ink">
                  <Check className="h-4 w-4" strokeWidth={3} />
                  Paid the bill
                </span>
              ) : rowPaid ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-sm font-semibold text-ink">
                  <Check className="h-4 w-4" strokeWidth={3} />
                  Settled
                </span>
              ) : selfIsPayer ? (
                // Payer's view: they collect — mark received when paid.
                <button
                  type="button"
                  onClick={() => togglePaid(pm.memberId)}
                  className="rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-muted-ink transition-colors hover:bg-secondary hover:text-ink"
                >
                  Mark as paid
                </button>
              ) : (
                // A guest's view of another person.
                <span className="text-xs font-medium text-muted-ink">
                  owes {payerName}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Pay-the-payer deep link when a handle is saved; plain button otherwise. */
function PayAction({
  handle,
  amount,
  note,
}: {
  handle: SettlementView['payerHandle']
  amount: number
  note: string
}) {
  const className =
    'rounded-full bg-tangerine px-4 py-2 text-sm font-semibold text-ink transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-receipt'
  const href = handle ? paymentLink(handle, amount, note) : null
  return href && handle ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {payButtonLabel(handle.provider)}
    </a>
  ) : (
    <button type="button" className={className}>
      Pay with Venmo
    </button>
  )
}
