import 'server-only'

import { NextResponse } from 'next/server'
import { ZodError, type ZodType } from 'zod'

/** Standard success JSON. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

/** Standard error JSON — never leaks keys, internals, or stack traces. */
export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status },
  )
}

/** Parse + validate a JSON request body against a Zod schema. */
export async function parseBody<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return { data: null, error: fail('Invalid JSON body', 400) }
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    const issues = result.error instanceof ZodError ? result.error.issues : []
    return {
      data: null,
      error: fail('Validation failed', 422, issues),
    }
  }
  return { data: result.data, error: null }
}

/** Log internal errors server-side, return a generic message to the client. */
export function serverError(scope: string, err: unknown) {
  console.log(`[v0] ${scope} error:`, err instanceof Error ? err.message : err)
  return fail('Something went wrong. Please try again.', 500)
}

/** 429 with a `Retry-After` header so a well-behaved client knows when to retry. */
export function tooManyRequests(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, Math.round(retryAfterSeconds))) },
    },
  )
}

/**
 * Best-effort client IP from the headers Vercel/most proxies set. Falls back to
 * 'unknown' (all unidentifiable clients then share one bucket) rather than
 * throwing — IP is a defense-in-depth signal here, not a security boundary.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}
