'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, X, ReceiptText } from 'lucide-react'
import { formatMoney } from '@/lib/tabby-data'
import type { SessionStatus } from '@/lib/types/tabby'
import { getSession, deleteSession } from '@/lib/api/tabby-client'
import { listBills, removeBill, type StoredBill } from '@/lib/session-store'

type BillView = StoredBill & {
  merchant: string | null
  total: number
  status: SessionStatus | null
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  open: 'Open',
  expensed: 'Claiming',
  settled: 'Settled',
}

/**
 * Device-local "My bills" — every split this browser created or joined. Tap one
 * to reopen it, or delete it. No account needed (separate from Clerk history).
 */
export function BillsSheet({
  open,
  onClose,
  onOpenBill,
  onNewSplit,
}: {
  open: boolean
  onClose: () => void
  onOpenBill: (sessionId: string, meId: string) => void
  onNewSplit: () => void
}) {
  const [bills, setBills] = useState<BillView[] | null>(null)

  const load = useCallback(async () => {
    const stored = listBills()
    const views = await Promise.all(
      stored.map(async (b): Promise<BillView | null> => {
        const res = await getSession(b.sessionId)
        if (!res.ok || !res.data.meta) return null
        return {
          ...b,
          merchant: res.data.expense?.merchant ?? null,
          total: res.data.expense?.total ?? 0,
          status: res.data.meta.status,
        }
      }),
    )
    setBills(views.filter((v): v is BillView => v !== null))
  }, [])

  useEffect(() => {
    if (open) {
      setBills(null)
      void load()
    }
  }, [open, load])

  if (!open) return null

  async function handleDelete(sessionId: string) {
    // Best-effort server delete (succeeds when this browser is the host);
    // always remove from the local list either way.
    await deleteSession(sessionId)
    removeBill(sessionId)
    setBills((prev) => prev?.filter((b) => b.sessionId !== sessionId) ?? null)
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Your bills"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-ink/45 motion-safe:animate-[fade-in_0.25s_ease]"
      />

      <div className="relative max-h-[88%] overflow-y-auto rounded-t-[28px] border-t border-hairline bg-canvas px-5 pb-6 pt-3 shadow-[0_-20px_50px_-12px_rgba(8,40,30,0.4)] motion-safe:animate-[sheet-up_0.32s_cubic-bezier(0.34,1.1,0.64,1)]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-leader" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-ink transition-colors hover:bg-leader/40 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-heading text-2xl font-bold text-ink">Your bills</h2>
        <p className="mt-1 text-sm text-muted-ink">
          Splits on this device. Tap to reopen, or delete.
        </p>

        <button
          type="button"
          onClick={onNewSplit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-tangerine px-5 py-3 font-semibold text-ink transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Start a new split
        </button>

        <div className="mt-5">
          {bills === null ? (
            <p className="py-6 text-center text-sm text-muted-ink">Loading…</p>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-spruce/10 text-spruce">
                <ReceiptText className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">No bills yet</p>
              <p className="mt-1 text-sm text-muted-ink">
                Capture or join a split and it shows up here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {bills.map((b) => (
                <li
                  key={b.sessionId}
                  className="flex items-center gap-3 rounded-2xl border border-hairline bg-receipt px-4 py-3 shadow-[0_12px_28px_-22px_rgba(11,83,65,0.35)]"
                >
                  <button
                    type="button"
                    onClick={() => onOpenBill(b.sessionId, b.meId)}
                    className="flex min-w-0 flex-1 flex-col items-start text-left focus-visible:outline-none"
                  >
                    <span className="truncate font-medium text-ink">
                      {b.merchant || 'Untitled split'}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-ink">
                      <span>
                        {new Date(b.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span
                        className={
                          b.status === 'settled'
                            ? 'rounded-full bg-mint px-2 py-0.5 font-semibold text-ink'
                            : 'rounded-full bg-leader/40 px-2 py-0.5 font-semibold text-muted-ink'
                        }
                      >
                        {b.status ? STATUS_LABEL[b.status] : '—'}
                      </span>
                    </span>
                  </button>

                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                    {formatMoney(b.total)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(b.sessionId)}
                    aria-label="Delete bill"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-ink transition-colors hover:bg-leader/40 hover:text-ink"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
