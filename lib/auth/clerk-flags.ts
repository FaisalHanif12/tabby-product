/**
 * Whether Clerk auth is configured. Safe to import from both client and server:
 * NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is inlined at build time, so this evaluates
 * identically on both sides and lets every auth surface degrade gracefully when
 * the keys are absent (the anonymous app still renders).
 */
export const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''

export const clerkEnabled = clerkPublishableKey.length > 0
