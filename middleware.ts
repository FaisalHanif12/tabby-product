import { NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { clerkEnabled } from '@/lib/auth/clerk-flags'

/**
 * Auth middleware. When Clerk is configured we run clerkMiddleware(), which
 * attaches auth context but — crucially — protects NOTHING by default (we never
 * call auth.protect()). Every existing anonymous route stays fully open. When
 * Clerk is not configured, this is a pass-through so the app runs with no
 * CLERK_* env vars.
 */
const handler = clerkEnabled ? clerkMiddleware() : () => NextResponse.next()

export default handler

export const config = {
  matcher: [
    // Skip Next internals and static files; run on everything else + API.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
