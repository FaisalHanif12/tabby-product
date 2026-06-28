'use client'

/**
 * Carries the active session identity (session id + this browser's member id)
 * across page navigations and reloads — e.g. a guest who joins on
 * `/s/[id]/join` and is then routed into the claim screen on `/`.
 *
 * This is identity, not authority: host/member authorisation is enforced
 * server-side via httpOnly cookies. Losing or clearing this just drops the
 * client back to the mock experience, never a dead end.
 */
export type ActiveSession = { sessionId: string; meId: string }

const KEY = 'tabby:active-session'

export function saveActiveSession(session: ActiveSession): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    /* storage unavailable (private mode, SSR) — non-fatal */
  }
}

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (
      value &&
      typeof value.sessionId === 'string' &&
      typeof value.meId === 'string'
    ) {
      return value as ActiveSession
    }
    return null
  } catch {
    return null
  }
}

export function clearActiveSession(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* non-fatal */
  }
}
