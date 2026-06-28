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

/* ── Device-local bill history ───────────────────────────────────────────────
 * Every split this browser created or joined, so the user can revisit, reopen,
 * or remove past bills WITHOUT needing an account. (Signed-in cross-device
 * history is the separate Clerk feature.) Newest first.
 */
export type StoredBill = { sessionId: string; meId: string; createdAt: number }

const BILLS_KEY = 'tabby:bills'

export function listBills(): StoredBill[] {
  try {
    const raw = window.localStorage.getItem(BILLS_KEY)
    if (!raw) return []
    const value = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value
      .filter(
        (b) =>
          b &&
          typeof b.sessionId === 'string' &&
          typeof b.meId === 'string',
      )
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  } catch {
    return []
  }
}

/** Add (or refresh) a bill at the front of the list — deduped by sessionId. */
export function addBill(bill: { sessionId: string; meId: string }): void {
  try {
    const existing = listBills().filter((b) => b.sessionId !== bill.sessionId)
    const next: StoredBill[] = [
      { ...bill, createdAt: Date.now() },
      ...existing,
    ].slice(0, 50)
    window.localStorage.setItem(BILLS_KEY, JSON.stringify(next))
  } catch {
    /* non-fatal */
  }
}

export function removeBill(sessionId: string): void {
  try {
    const next = listBills().filter((b) => b.sessionId !== sessionId)
    window.localStorage.setItem(BILLS_KEY, JSON.stringify(next))
  } catch {
    /* non-fatal */
  }
}
