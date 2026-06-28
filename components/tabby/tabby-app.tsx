'use client'

import { useEffect, useState } from 'react'
import { Camera, ReceiptText, HandCoins, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/tabby-data'
import { useSession } from '@/lib/hooks/use-session'
import {
  loadActiveSession,
  saveActiveSession,
  clearActiveSession,
  addBill,
} from '@/lib/session-store'
import { AuthButton } from '@/components/auth/auth-button'
import { AccountLinker } from '@/components/auth/account-linker'
import { Wordmark } from './wordmark'
import { LandingScreen } from './landing-screen'
import { CaptureScreen } from './capture-screen'
import { ClaimScreen } from './claim-screen'
import { SettleScreen } from './settle-screen'
import { ShareSheet } from './share-sheet'
import { BillsSheet } from './bills-sheet'

type Screen = 'landing' | 'capture' | 'claim' | 'settle'

const TABS: { id: Screen; label: string; icon: typeof Camera }[] = [
  { id: 'capture', label: 'Capture', icon: Camera },
  { id: 'claim', label: 'Claim', icon: ReceiptText },
  { id: 'settle', label: 'Settle', icon: HandCoins },
]

export function TabbyApp({
  initialScreen = 'landing',
  initialSessionId = null,
  initialMeId = null,
}: {
  initialScreen?: Screen
  /** Deep-link session (e.g. opening a split from /history): ?s=&m=. */
  initialSessionId?: string | null
  initialMeId?: string | null
}) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [shareOpen, setShareOpen] = useState(false)
  const [billsOpen, setBillsOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId)
  const [meId, setMeId] = useState<string | null>(initialMeId)

  // Resolve the active session. An explicit deep-link (?s=&m=, e.g. from the
  // history list) wins and is persisted; otherwise pick up a session created or
  // joined elsewhere (a guest routed here from /s/[id]/join). Falls back to mock.
  useEffect(() => {
    if (initialSessionId && initialMeId) {
      saveActiveSession({ sessionId: initialSessionId, meId: initialMeId })
      return
    }
    const active = loadActiveSession()
    if (active) {
      setSessionId(active.sessionId)
      setMeId(active.meId)
    }
  }, [initialSessionId, initialMeId])

  // Live polling (pauses on tab-hidden, see use-session.ts). Null id => no-op.
  const { view, refresh } = useSession(sessionId)

  function handleSession(id: string, memberId: string) {
    setSessionId(id)
    setMeId(memberId)
    saveActiveSession({ sessionId: id, meId: memberId })
    addBill({ sessionId: id, meId: memberId }) // record in device-local history
  }

  function handleNewSplit() {
    clearActiveSession()
    setSessionId(null)
    setMeId(null)
    setBillsOpen(false)
    setScreen('capture')
  }

  // Open a past bill from the Bills sheet.
  function openBill(id: string, memberId: string) {
    setSessionId(id)
    setMeId(memberId)
    saveActiveSession({ sessionId: id, meId: memberId })
    setBillsOpen(false)
    setScreen('claim')
  }

  const showTabs = screen !== 'landing'
  const peopleCount = view?.members.length ?? 4

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
      {/* Invisible: links guest splits to the account on sign-in (no-op if
          Clerk is unconfigured or the user is signed out). */}
      <AccountLinker />

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
            <div className="flex items-center gap-3">
              {showTabs && (
                <span className="font-mono text-xs text-receipt/70">
                  {peopleCount} people
                </span>
              )}
              <button
                type="button"
                onClick={() => setBillsOpen(true)}
                aria-label="Your bills"
                className="flex h-8 w-8 items-center justify-center rounded-full text-receipt/80 transition-colors hover:bg-receipt/10 hover:text-receipt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
              >
                <History className="h-[18px] w-[18px]" />
              </button>
              <AuthButton />
            </div>
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
          <CaptureScreen
            sessionId={sessionId}
            onSession={handleSession}
            onStart={() => setShareOpen(true)}
          />
        )}
        {screen === 'claim' && (
          <ClaimScreen
            sessionId={sessionId}
            meId={meId}
            view={view}
            onClaimed={refresh}
          />
        )}
        {screen === 'settle' && (
          <SettleScreen
            sessionId={sessionId}
            meId={meId}
            view={view}
            onNewSplit={handleNewSplit}
            onRefresh={refresh}
          />
        )}
      </div>

      {/* ── REGION 3: FOOTER (flex-shrink:0, always visible) ── */}
      {/* Claim + Settle each pin their primary action here, below the scroll. */}
      {screen === 'claim' && <ClaimFooter onSettle={() => setScreen('settle')} />}
      {screen === 'settle' && <SettleFooter />}

      {/* ── OVERLAY: invite bottom sheet (slides over the dimmed receipt) ── */}
      <ShareSheet
        open={shareOpen}
        sessionId={sessionId}
        members={view?.members ?? null}
        onClose={() => setShareOpen(false)}
        onGoToReceipt={() => {
          setShareOpen(false)
          setScreen('claim')
        }}
      />

      <BillsSheet
        open={billsOpen}
        onClose={() => setBillsOpen(false)}
        onOpenBill={openBill}
        onNewSplit={handleNewSplit}
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

/*
 * SettleFooter mirrors ClaimFooter: a pinned bottom bar (outside the scroll
 * zone) showing the outstanding total + a Copy-summary action. Fed by the
 * `tabby:settle-summary` event from SettleScreen; hides itself until there are
 * unpaid rows.
 */
function SettleFooter() {
  const [summary, setSummary] = useState({
    outstanding: 0,
    text: '',
    ready: false,
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (
        e as CustomEvent<{ outstanding: number; text: string; ready: boolean }>
      ).detail
      setSummary(detail)
    }
    window.addEventListener('tabby:settle-summary', handler)
    return () => window.removeEventListener('tabby:settle-summary', handler)
  }, [])

  if (!summary.ready) return null

  function copy() {
    navigator.clipboard?.writeText(summary.text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-ink/95 px-5 py-3 shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex flex-col">
          <span className="text-xs text-receipt/60">Still owed to you</span>
          <span className="font-mono text-xl font-semibold tabular-nums text-receipt">
            {formatMoney(summary.outstanding)}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="rounded-full bg-tangerine px-7 py-3 font-semibold text-ink transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          {copied ? 'Copied' : 'Copy summary'}
        </button>
      </div>
    </div>
  )
}
