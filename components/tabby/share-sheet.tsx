'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Copy, Share2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JOINED_MEMBERS, SHARE_LINK } from '@/lib/tabby-data'

export function ShareSheet({
  open,
  onClose,
  onGoToReceipt,
}: {
  open: boolean
  onClose: () => void
  onGoToReceipt: () => void
}) {
  const [copied, setCopied] = useState(false)

  if (!open) return null

  function copyLink() {
    navigator.clipboard?.writeText(`https://${SHARE_LINK}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  function shareVia() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: 'Join my Tabby split',
          text: 'Tap the link and add your name to split the bill.',
          url: `https://${SHARE_LINK}`,
        })
        .catch(() => {})
    } else {
      copyLink()
    }
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Invite the table"
    >
      {/* Dimmed backdrop over the receipt */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close invite sheet"
        className="absolute inset-0 bg-ink/45 motion-safe:animate-[fade-in_0.25s_ease]"
      />

      {/* Sheet */}
      <div className="relative max-h-[88%] overflow-y-auto rounded-t-[28px] border-t border-hairline bg-canvas px-5 pb-6 pt-3 shadow-[0_-20px_50px_-12px_rgba(8,40,30,0.4)] motion-safe:animate-[sheet-up_0.32s_cubic-bezier(0.34,1.1,0.64,1)]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-leader" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-ink transition-colors hover:bg-leader/40 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-heading text-2xl font-bold text-ink">
          Invite the table
        </h2>
        <p className="mt-1 text-sm text-muted-ink">
          They just tap the link and add their name. No app, no signup.
        </p>

        {/* QR hero */}
        <div className="mt-5 flex justify-center">
          <div className="rounded-3xl border border-hairline bg-receipt p-4 shadow-[0_16px_40px_-18px_rgba(11,83,65,0.35)]">
            <Image
              src="/images/qr-placeholder.png"
              alt="QR code to join this split"
              width={184}
              height={184}
              className="rounded-xl"
              priority
            />
          </div>
        </div>

        {/* Share link + copy */}
        <div className="mt-5 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-hairline bg-receipt px-4 py-3">
            <span className="truncate font-mono text-sm text-ink">
              {SHARE_LINK}
            </span>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine',
              copied ? 'bg-mint text-ink' : 'bg-tangerine text-ink',
            )}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" strokeWidth={2.6} />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy link
              </>
            )}
          </button>
        </div>

        {/* Share via native */}
        <button
          type="button"
          onClick={shareVia}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-hairline bg-receipt px-5 py-3 font-semibold text-ink transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
        >
          <Share2 className="h-4 w-4" />
          Share via…
        </button>

        {/* Joined indicator */}
        <div className="mt-5 flex items-center justify-center gap-2.5">
          <div className="flex -space-x-2">
            {JOINED_MEMBERS.map((m) => (
              <span
                key={m.id}
                style={{ backgroundColor: m.color }}
                className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-semibold text-ink ring-2 ring-canvas"
              >
                {m.initials}
              </span>
            ))}
          </div>
          <span className="text-sm font-medium text-muted-ink">
            <span className="font-semibold text-spruce">
              {JOINED_MEMBERS.length} joined
            </span>{' '}
            so far
          </span>
        </div>

        <button
          type="button"
          onClick={onGoToReceipt}
          className="mt-5 w-full rounded-full bg-spruce px-7 py-4 text-base font-semibold text-receipt shadow-[0_14px_30px_-14px_rgba(11,83,65,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Go to receipt
        </button>
      </div>
    </div>
  )
}
