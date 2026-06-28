'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatMoney,
  shareForMember,
  subtotalOf,
  type LineItem,
  type Member,
} from '@/lib/tabby-data'
import type { SessionView } from '@/lib/types/tabby'
import { setItemClaim } from '@/lib/api/tabby-client'
import { ReceiptCard, ReceiptLine } from './receipt-card'
import { MemberRoster, Avatar } from './member-avatars'

export function ClaimScreen({
  sessionId = null,
  meId = null,
  view = null,
  onClaimed,
}: {
  sessionId?: string | null
  meId?: string | null
  view?: SessionView | null
  onClaimed?: () => void
} = {}) {
  // Purely live: requires a session with a persisted expense. There is NO mock
  // fallback — without a real receipt the screen shows an empty state.
  const live = Boolean(sessionId && view?.expense)

  const sourceItems: LineItem[] = useMemo(() => {
    if (live && view) {
      return view.items.map((it) => ({
        id: it.id,
        label: it.label,
        price: it.price,
        claimedBy: it.claimedBy,
      }))
    }
    return []
  }, [live, view])

  const members: Member[] = live && view ? view.members : []
  const memberMap: Record<string, Member> = useMemo(() => {
    if (live && view) {
      return Object.fromEntries(view.members.map((m) => [m.id, m]))
    }
    return {}
  }, [live, view])

  // "You" — the current member (empty until we have a live identity).
  const selfId = meId ?? ''

  const tax = live && view?.expense ? view.expense.tax : 0
  const tip = live && view?.expense ? view.expense.tip : 0

  const merchant =
    live && view?.expense?.merchant ? view.expense.merchant : undefined
  const expenseId = view?.expense?.id ?? null

  const [items, setItems] = useState<LineItem[]>(sourceItems)

  // Reconcile local (optimistic) state with the latest polled data.
  useEffect(() => {
    setItems(sourceItems)
  }, [sourceItems])

  const subtotal = useMemo(() => subtotalOf(items), [items])
  const computedTax = tax
  const computedTip = tip
  const total = subtotal + computedTax + computedTip

  const yourItemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + shareForMember(item, selfId), 0),
    [items, selfId],
  )
  const yourCount = items.filter((i) => i.claimedBy.includes(selfId)).length

  // Keep the lifted ClaimFooter in sync via a custom event
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('tabby:claim-summary', {
        detail: { count: yourCount, total: yourItemsTotal },
      }),
    )
  }, [yourCount, yourItemsTotal])

  function toggleClaim(id: string) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const mine = item.claimedBy.includes(selfId)

    // Optimistic update first.
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        return {
          ...it,
          claimedBy: mine
            ? it.claimedBy.filter((m) => m !== selfId)
            : [...it.claimedBy, selfId],
        }
      }),
    )

    // Reconcile with the server when live; mock mode stays local-only.
    if (live && sessionId && expenseId && selfId) {
      void setItemClaim(
        id,
        { sessionId, expenseId, memberId: selfId },
        !mine,
      ).then((res) => {
        if (res.ok) onClaimed?.()
      })
    }
  }

  // Empty state: no receipt has been captured for this session yet.
  if (!live) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 pb-10 pt-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-spruce/10 text-spruce">
          <ReceiptText className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold text-ink">
          Nothing to claim yet
        </h1>
        <p className="mt-1.5 text-sm text-muted-ink">
          Capture a receipt first — then everyone taps the items they had.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="px-5 pt-4">
        <h1 className="font-heading text-2xl font-bold text-ink">
          Tap what you had
        </h1>
        <p className="mt-1 text-sm text-muted-ink">
          Claim your items — share a dish by tapping it together.
        </p>
        <div className="mt-5 flex justify-center">
          <MemberRoster members={members} activeId={selfId} />
        </div>
      </div>

      <div className="px-4 pt-6">
        <ReceiptCard
          merchant={merchant}
          className="mx-auto max-w-md rounded-[20px]"
        >
          <ul className="mt-6 flex flex-col">
            {items.map((item) => {
              const mine = item.claimedBy.includes(selfId)
              const shared = item.claimedBy.length > 1
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleClaim(item.id)}
                    aria-pressed={mine}
                    className={cn(
                      'flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-receipt',
                      mine ? 'bg-tangerine/12' : 'hover:bg-leader/25',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        mine
                          ? 'border-tangerine bg-tangerine text-ink'
                          : 'border-leader text-transparent',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>

                    <span className="flex min-w-0 flex-1 items-baseline">
                      <span className="truncate font-medium text-ink">
                        {item.label}
                      </span>
                      <span className="leader" aria-hidden="true" />
                    </span>

                    <span className="flex flex-col items-end gap-1">
                      <span className="font-mono tabular-nums font-medium text-ink">
                        {formatMoney(item.price)}
                      </span>
                      <span className="flex items-center gap-1">
                        {shared && (
                          <span className="mr-0.5 font-mono text-[10px] text-muted-ink">
                            ÷{item.claimedBy.length}
                          </span>
                        )}
                        {item.claimedBy.map((mid) =>
                          memberMap[mid] ? (
                            <Avatar
                              key={mid}
                              member={memberMap[mid]}
                              size="sm"
                              popKey={`${item.id}-${mid}`}
                            />
                          ) : null,
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <hr className="tear-line my-5" />

          <div className="flex flex-col gap-2">
            <ReceiptLine label="Subtotal" value={formatMoney(subtotal)} />
            <ReceiptLine label="Tax" value={formatMoney(computedTax)} />
            <ReceiptLine
              label="Tip"
              value={formatMoney(computedTip)}
            />
            <div className="mt-2">
              <ReceiptLine
                label="Total"
                value={formatMoney(total)}
                emphasis
              />
            </div>
          </div>
        </ReceiptCard>
      </div>

      {/* bottom spacer so the last item isn't flush against the footer */}
      <div className="h-3" />
    </div>
  )
}
