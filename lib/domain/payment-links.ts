/**
 * PURE payment deep-link builders — no IO.
 *
 * When the payer of a split has a saved payment handle (Venmo / Cash App /
 * PayPal), the settle screen turns "Pay with X" into a real deep link prefilled
 * with the amount and a note. These are web links (work on desktop + mobile);
 * the native apps intercept them when installed.
 */

import type { PaymentHandle, PaymentProvider } from '@/lib/types/tabby'

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  venmo: 'Venmo',
  cashapp: 'Cash App',
  paypal: 'PayPal',
}

/** Strip a leading @ or $ and surrounding whitespace from a handle. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^[@$]+/, '')
}

function amountStr(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2)
}

/**
 * Build a prefilled payment URL for paying `handle` `amount`, or null if the
 * handle is unusable (empty username).
 */
export function paymentLink(
  handle: PaymentHandle,
  amount: number,
  note = 'Tabby',
): string | null {
  const user = normalizeUsername(handle.username)
  if (!user) return null

  const amt = amountStr(amount)

  switch (handle.provider) {
    case 'venmo':
      return `https://venmo.com/${encodeURIComponent(user)}?txn=pay&amount=${amt}&note=${encodeURIComponent(note)}`
    case 'cashapp':
      return `https://cash.app/$${encodeURIComponent(user)}/${amt}`
    case 'paypal':
      return `https://paypal.me/${encodeURIComponent(user)}/${amt}`
    default:
      return null
  }
}

/** Button label for a provider, e.g. "Pay with Venmo". */
export function payButtonLabel(provider: PaymentProvider): string {
  return `Pay with ${PROVIDER_LABEL[provider]}`
}
