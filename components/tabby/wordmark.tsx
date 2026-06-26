import { cn } from '@/lib/utils'

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn('font-heading font-extrabold tracking-tight', className)}
    >
      Tabby<span className="text-tangerine">.</span>
    </span>
  )
}
