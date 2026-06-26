'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Wordmark } from './wordmark'
import { JoinScreen } from './join-screen'

export function JoinFlow() {
  const router = useRouter()

  return (
    <main
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden bg-canvas',
        'sm:h-[min(844px,100vh)] sm:w-[390px] sm:shrink-0 sm:rounded-[28px]',
        'sm:border sm:border-[rgba(8,40,30,0.06)] sm:shadow-[0_20px_50px_-12px_rgba(8,40,30,0.28)]',
      )}
    >
      <div className="shrink-0">
        <header className="bg-spruce px-5 pb-6 pt-5">
          <Wordmark className="text-xl text-receipt" />
        </header>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto motion-safe:animate-rise">
        <JoinScreen onJoin={() => router.push('/?screen=claim')} />
      </div>
    </main>
  )
}
