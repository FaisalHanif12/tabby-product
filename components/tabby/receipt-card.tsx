import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Wordmark } from './wordmark'

export function ReceiptCard({
  merchant,
  date,
  children,
  className,
}: {
  merchant?: string
  date?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'receipt-perforated bg-receipt text-ink shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <div className="px-6 py-7">
        <header className="flex flex-col items-center gap-1 text-center">
          <Wordmark className="text-2xl text-ink" />
          {merchant ? (
            <h2 className="mt-2 text-base font-semibold text-ink">{merchant}</h2>
          ) : null}
          {date ? (
            <p className="font-mono text-xs uppercase tracking-wide text-muted-ink">
              {date}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  )
}

/** A row inside a receipt: label · · · · price, with a dotted leader line. */
export function ReceiptLine({
  label,
  value,
  emphasis,
}: {
  label: ReactNode
  value: ReactNode
  emphasis?: boolean
}) {
  return (
    <div className="flex items-baseline">
      <span
        className={cn(
          'text-muted-ink',
          emphasis && 'font-semibold text-ink',
        )}
      >
        {label}
      </span>
      <span className="leader" aria-hidden="true" />
      <span
        className={cn(
          'font-mono tabular-nums text-ink',
          emphasis && 'text-lg font-semibold',
        )}
      >
        {value}
      </span>
    </div>
  )
}
