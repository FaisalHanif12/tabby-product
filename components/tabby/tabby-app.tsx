'use client'

import { useState } from 'react'
import { Camera, ReceiptText, HandCoins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Wordmark } from './wordmark'
import { CaptureScreen } from './capture-screen'
import { ClaimScreen } from './claim-screen'
import { SettleScreen } from './settle-screen'

type Screen = 'capture' | 'claim' | 'settle'

const TABS: { id: Screen; label: string; icon: typeof Camera }[] = [
  { id: 'capture', label: 'Capture', icon: Camera },
  { id: 'claim', label: 'Claim', icon: ReceiptText },
  { id: 'settle', label: 'Settle', icon: HandCoins },
]

export function TabbyApp() {
  const [screen, setScreen] = useState<Screen>('claim')

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md">
      <header className="flex items-center justify-between px-5 pt-6">
        <Wordmark className="text-xl text-receipt" />
        <span className="font-mono text-xs text-receipt/60">4 people</span>
      </header>

      <nav className="sticky top-0 z-30 px-4 pt-3 pb-2">
        <div className="flex gap-1 rounded-full bg-spruce-dark/60 p-1 backdrop-blur">
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
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine',
                  active
                    ? 'bg-receipt text-ink'
                    : 'text-receipt/70 hover:text-receipt',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div key={screen} className="motion-safe:animate-rise">
        {screen === 'capture' && (
          <CaptureScreen onStart={() => setScreen('claim')} />
        )}
        {screen === 'claim' && (
          <ClaimScreen onSettle={() => setScreen('settle')} />
        )}
        {screen === 'settle' && <SettleScreen />}
      </div>
    </main>
  )
}
