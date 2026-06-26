'use client'

import { useEffect, useState } from 'react'
import { Camera, ReceiptText, HandCoins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/tabby-data'
import { Wordmark } from './wordmark'
import { LandingScreen } from './landing-screen'
import { CaptureScreen } from './capture-screen'
import { ClaimScreen } from './claim-screen'
import { SettleScreen } from './settle-screen'
import { ShareSheet } from './share-sheet'

type Screen = 'landing' | 'capture' | 'claim' | 'settle'

const TABS: { id: Screen; label: string; icon: typeof Camera }[] = [
  { id: 'capture', label: 'Capture', icon: Camera },
  { id: 'claim', label: 'Claim', icon: ReceiptText },
  { id: 'settle', label: 'Settle', icon: HandCoins },
]

export function TabbyApp({
  initialScreen = 'landing',
}: {
  initialScreen?: Screen
}) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [shareOpen, setShareOpen] = useState(false)

  const showTabs = screen !== 'landing'

  return (
    /*
     * FRAME
     * Mobile  : fills the full viewport (h-full w-full), no rounding.
     * Desktop : fixed 390×min(844px,100vh) centered in the viewport,
     *           rounded + shadowed like a phone resting on a surface.
     * `relative` anchors the share bottom-sheet overlay to the frame.
     */
    <main
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden bg-canvas',
        'sm:h-[min(844px,100vh)] sm:w-[390px] sm:shrink-0 sm:rounded-[28px]',
        'sm:border sm:border-[rgba(8,40,30,0.06)] sm:shadow-[0_20px_50px_-12px_rgba(8,40,30,0.28)]',
      )}
    >
      {/* ── REGION 1: HEADER (flex-shrink:0, never scrolls) ── */}
      <div className="shrink-0">
        <header
          className={cn(
            'bg-spruce px-5 pt-5',
            showTabs ? 'rounded-b-[24px] pb-9' : 'pb-6',
          )}
        >
          <div className="flex items-center justify-between">
            <Wordmark className="text-xl text-receipt" />
            {showTabs && (
              <span className="font-mono text-xs text-receipt/70">
                4 people
              </span>
            )}
          </div>
        </header>

        {showTabs && (
          <nav className="relative z-10 -mt-5 px-4 pb-3">
            <div className="flex gap-1 rounded-full border border-hairline bg-receipt p-1 shadow-[0_12px_30px_-14px_rgba(11,83,65,0.4)]">
              {TABS.map((tab) => {
                const active = screen === tab.id
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setScreen(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine',
                      active
                        ? 'bg-spruce text-receipt'
                        : 'text-muted-ink hover:text-ink',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </nav>
        )}
      </div>

      {/* ── REGION 2: SCROLLABLE CONTENT (flex:1, min-height:0, overflow-y:auto) ── */}
      {/* min-h-0 is required — without it flex won't constrain the child height  */}
      <div
        key={screen}
        className="min-h-0 flex-1 overflow-y-auto motion-safe:animate-rise"
      >
        {screen === 'landing' && (
          <LandingScreen onStart={() => setScreen('capture')} />
        )}
        {screen === 'capture' && (
          <CaptureScreen onStart={() => setShareOpen(true)} />
        )}
        {screen === 'claim' && <ClaimScreen />}
        {screen === 'settle' && (
          <SettleScreen onNewSplit={() => setScreen('landing')} />
        )}
      </div>

      {/* ── REGION 3: FOOTER (flex-shrink:0, always visible) ── */}
      {/* Only the Claim screen has a bottom bar; others render nothing here.     */}
      {screen === 'claim' && <ClaimFooter onSettle={() => setScreen('settle')} />}

      {/* ── OVERLAY: invite bottom sheet (slides over the dimmed receipt) ── */}
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onGoToReceipt={() => {
          setShareOpen(false)
          setScreen('claim')
        }}
      />
    </main>
  )
}

/*
 * ClaimFooter is lifted out of ClaimScreen so it lives outside the scroll zone.
 * ClaimScreen reads its own state internally; this footer receives a parallel
 * state signal via a custom event dispatched by ClaimScreen.
 */
function ClaimFooter({ onSettle }: { onSettle: () => void }) {
  const [summary, setSummary] = useState({ count: 0, total: 0 })

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ count: number; total: number }>).detail
      setSummary(detail)
    }
    window.addEventListener('tabby:claim-summary', handler)
    return () => window.removeEventListener('tabby:claim-summary', handler)
  }, [])

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink/95 px-5 py-3 shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex flex-col">
          <span className="text-xs text-receipt/60">
            Your items{summary.count ? ` · ${summary.count}` : ''}
          </span>
          <span className="font-mono text-xl font-semibold tabular-nums text-receipt">
            {formatMoney(summary.total)}
          </span>
        </div>
        <button
          type="button"
          onClick={onSettle}
          className="rounded-full bg-tangerine px-7 py-3 font-semibold text-ink transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          Settle up
        </button>
      </div>
    </div>
  )
}
