'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSession } from '@/lib/api/tabby-client'
import type { SessionView } from '@/lib/types/tabby'

/**
 * Polls GET /api/sessions/[id] every `intervalMs` while the tab is visible.
 * Polling pauses on `visibilitychange` (hidden) and resumes on focus.
 * Returns null data when no sessionId is provided or the backend is unreachable
 * (callers fall back to mock data).
 */
export function useSession(
  sessionId: string | null,
  intervalMs = 3000,
): {
  view: SessionView | null
  loading: boolean
  reachable: boolean
  refresh: () => Promise<void>
} {
  const [view, setView] = useState<SessionView | null>(null)
  const [loading, setLoading] = useState(Boolean(sessionId))
  const [reachable, setReachable] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    const res = await getSession(sessionId)
    if (res.ok) {
      setView(res.data)
      setReachable(true)
    } else {
      setReachable(false)
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      setView(null)
      setLoading(false)
      return
    }

    let cancelled = false

    function start() {
      if (timerRef.current) return
      timerRef.current = setInterval(() => {
        if (!cancelled) void refresh()
      }, intervalMs)
    }
    function stop() {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        stop()
      } else {
        void refresh()
        start()
      }
    }

    void refresh()
    start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [sessionId, intervalMs, refresh])

  return { view, loading, reachable, refresh }
}
