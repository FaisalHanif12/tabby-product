'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  INITIAL_ITEMS,
  MEMBERS,
  MEMBER_MAP,
  MERCHANT,
  TAX_RATE,
  TIP_RATE,
  formatMoney,
  shareForMember,
  subtotalOf,
  type LineItem,
} from '@/lib/tabby-data'
import { ReceiptCard, ReceiptLine } from './receipt-card'
import { MemberRoster, Avatar } from './member-avatars'

export function ClaimScreen() {
  const [items, setItems] = useState<LineItem[]>(INITIAL_ITEMS)

  const subtotal = useMemo(() => subtotalOf(items), [items])
  const tax = subtotal * TAX_RATE
  const tip = subtotal * TIP_RATE
  const total = subtotal + tax + tip

  const yourItemsTotal = useMemo(
    () =>
      items.reduce((sum, item) => sum + shareForMember(item, 'you'), 0),
    [items],
  )
  const yourCount = items.filter((i) => i.claimedBy.includes('you')).length

  // Keep the lifted ClaimFooter in sync via a custom event
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('tabby:claim-summary', {
        detail: { count: yourCount, total: yourItemsTotal },
      }),
    )
  }, [yourCount, yourItemsTotal])

  function toggleClaim(id: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const mine = item.claimedBy.includes('you')
        return {
          ...item,
          claimedBy: mine
            ? item.claimedBy.filter((m) => m !== 'you')
            : [...item.claimedBy, 'you'],
        }
      }),
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
          <MemberRoster members={MEMBERS} activeId="you" />
        </div>
      </div>

      <div className="px-4 pt-6">
        <ReceiptCard
          merchant={MERCHANT.name}
          date={MERCHANT.date}
          className="mx-auto max-w-md rounded-[20px]"
        >
          <ul className="mt-6 flex flex-col">
            {items.map((item) => {
              const mine = item.claimedBy.includes('you')
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
                        {item.claimedBy.map((mid) => (
                          <Avatar
                            key={mid}
                            member={MEMBER_MAP[mid]}
                            size="sm"
                            popKey={`${item.id}-${mid}`}
                          />
                        ))}
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
            <ReceiptLine label="Tax" value={formatMoney(tax)} />
            <ReceiptLine label="Tip (18%)" value={formatMoney(tip)} />
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
