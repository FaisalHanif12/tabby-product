'use client'

import { Camera, Hand, HandCoins, ArrowRight, ReceiptText } from 'lucide-react'

const STEPS = [
  { icon: Camera, label: 'Snap' },
  { icon: Hand, label: 'Tap' },
  { icon: HandCoins, label: 'Settle' },
]

export function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden px-6 pb-8 pt-10">
      {/* faint receipt-paper watermark behind the hero */}
      <ReceiptText
        className="pointer-events-none absolute -right-8 top-6 h-56 w-56 rotate-12 text-leader/30"
        strokeWidth={1}
        aria-hidden="true"
      />

      <div className="relative flex flex-1 flex-col justify-center">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-hairline bg-receipt px-3 py-1 text-xs font-semibold text-muted-ink shadow-[0_8px_20px_-14px_rgba(11,83,65,0.4)]">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          Bills, but make them painless
        </span>

        <h1 className="mt-6 text-balance font-heading text-[2.75rem] font-extrabold leading-[1.02] tracking-tight text-ink">
          Split the bill,{' '}
          <span className="text-tangerine">fairly.</span>
        </h1>

        <p className="mt-4 max-w-[19rem] text-pretty text-base leading-relaxed text-muted-ink">
          Snap the receipt, tap what you actually ordered, and settle up in
          seconds. No spreadsheets, no awkward math.
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-tangerine px-7 py-4 text-base font-semibold text-ink shadow-[0_14px_30px_-12px_rgba(255,138,43,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Start a split
          <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
        </button>

        <p className="mt-3 text-center text-xs font-medium text-muted-ink">
          No app, no signup.
        </p>
      </div>

      {/* 3-step row connected with a continuous dotted line */}
      <div className="relative mt-10 flex items-start justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.label} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center gap-2 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-hairline bg-receipt text-spruce shadow-[0_10px_24px_-16px_rgba(11,83,65,0.5)]">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="text-[11px] font-medium leading-tight text-muted-ink">
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className="mt-6 h-0 flex-1 border-t-2 border-dotted border-leader"
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
