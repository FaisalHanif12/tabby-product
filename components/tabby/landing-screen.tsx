'use client'

import { Camera, Hand, HandCoins, ArrowRight } from 'lucide-react'

const STEPS = [
  { icon: Camera, label: 'Snap the receipt' },
  { icon: Hand, label: 'Tap what you had' },
  { icon: HandCoins, label: 'Settle up' },
]

export function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-full flex-col px-6 pb-8 pt-10">
      <div className="flex flex-1 flex-col justify-center">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-hairline bg-receipt px-3 py-1 text-xs font-semibold text-muted-ink shadow-[0_8px_20px_-14px_rgba(11,83,65,0.4)]">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          Bills, but make them painless
        </span>

        <h1 className="mt-5 text-balance font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-ink">
          Split the bill,{' '}
          <span className="text-tangerine">fairly.</span>
        </h1>

        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-ink">
          Snap the receipt, tap what you actually ordered, and settle up in
          seconds. No spreadsheets, no awkward math.
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-tangerine px-7 py-4 text-base font-semibold text-ink shadow-[0_14px_30px_-12px_rgba(255,138,43,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Start a split
          <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-10 flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.label} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-hairline bg-receipt text-spruce shadow-[0_10px_24px_-16px_rgba(11,83,65,0.5)]">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="max-w-[72px] text-[11px] font-medium leading-tight text-muted-ink">
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight
                  className="mb-5 h-4 w-4 shrink-0 text-leader"
                  strokeWidth={2.4}
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
