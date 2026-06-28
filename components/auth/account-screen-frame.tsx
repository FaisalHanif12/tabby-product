'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/tabby/wordmark'

/**
 * Mobile-framed shell for the signed-in account screens (/history, /profile).
 * Matches the main app frame so these feel native, with a Back link to the app.
 */
export function AccountScreenFrame({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div
      className="flex h-full items-stretch bg-canvas sm:items-center sm:justify-center"
      style={{
        background: 'linear-gradient(to bottom, #EEF2EF 0%, #E7EDE9 100%)',
      }}
    >
      <main
        className={cn(
          'relative flex h-full w-full flex-col overflow-hidden bg-canvas',
          'sm:h-[min(844px,100vh)] sm:w-[390px] sm:shrink-0 sm:rounded-[28px]',
          'sm:border sm:border-[rgba(8,40,30,0.06)] sm:shadow-[0_20px_50px_-12px_rgba(8,40,30,0.28)]',
        )}
      >
        <div className="shrink-0">
          <header className="bg-spruce px-5 pb-6 pt-5">
            <div className="flex items-center justify-between">
              <Wordmark className="text-xl text-receipt" />
              <Link
                href="/"
                className="flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs text-receipt/80 transition-colors hover:text-receipt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
            </div>
          </header>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto motion-safe:animate-rise">
          <div className="px-5 pb-10 pt-5">
            <h1 className="font-heading text-2xl font-bold text-ink">{title}</h1>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

/** Shown when an account screen is opened without auth available/configured. */
export function SignedOutNotice({ message }: { message: string }) {
  return (
    <p className="mt-4 text-sm text-muted-ink">
      {message}{' '}
      <Link
        href="/"
        className="font-semibold text-tangerine underline-offset-2 hover:underline"
      >
        Go back to Tabby
      </Link>
      .
    </p>
  )
}
