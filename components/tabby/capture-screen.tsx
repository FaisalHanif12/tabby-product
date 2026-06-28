'use client'

import { useEffect, useState } from 'react'
import {
  Camera,
  HandCoins,
  Plus,
  ReceiptText,
  Trash2,
  Upload,
  Hand,
} from 'lucide-react'
import {
  MERCHANT,
  PARSED_ITEMS,
  TAX_RATE,
  TIP_RATE,
  formatMoney,
} from '@/lib/tabby-data'
import { ReceiptCard } from './receipt-card'

type EditItem = { id: string; label: string; price: string }

const HOW_IT_WORKS = [
  { icon: Camera, label: 'Snap' },
  { icon: Hand, label: 'Tap' },
  { icon: HandCoins, label: 'Settle' },
]

export function CaptureScreen({ onStart }: { onStart: () => void }) {
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [items, setItems] = useState<EditItem[]>([])
  const [tax, setTax] = useState('0.00')
  const [tip, setTip] = useState('0.00')

  function handleScan() {
    setScanning(true)
  }

  // Mock OCR: after a short scan, populate the editable review.
  useEffect(() => {
    if (!scanning) return
    const timer = setTimeout(() => {
      const parsed = PARSED_ITEMS.map((p) => ({
        id: p.id,
        label: p.label,
        price: p.price.toFixed(2),
      }))
      const sub = PARSED_ITEMS.reduce((s, p) => s + p.price, 0)
      setItems(parsed)
      setTax((sub * TAX_RATE).toFixed(2))
      setTip((sub * TIP_RATE).toFixed(2))
      setScanned(true)
      setScanning(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [scanning])

  function updateItem(id: string, field: 'label' | 'price', value: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    )
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: `n${Date.now()}`, label: '', price: '0.00' },
    ])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0), 0)
  const total = subtotal + (Number(tax) || 0) + (Number(tip) || 0)

  if (scanning) {
    return (
      <div className="flex min-h-full flex-col px-4 pb-6 pt-5">
        <div className="px-1">
          <h1 className="font-heading text-2xl font-bold text-ink">
            Reading your receipt…
          </h1>
          <p className="mt-1 text-sm text-muted-ink">
            Hang tight — we&apos;re pulling out the line items.
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="relative overflow-hidden rounded-[20px]">
            <ReceiptCard
              merchant={MERCHANT.name}
              date={MERCHANT.date}
              className="mx-auto max-w-md rounded-[20px]"
            >
              <ul className="mt-6 flex flex-col gap-3">
                {PARSED_ITEMS.map((item, i) => (
                  <li
                    key={item.id}
                    className="shimmer-row flex items-center justify-between gap-3"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  >
                    <span className="font-medium text-ink">{item.label}</span>
                    <span className="font-mono tabular-nums text-ink">
                      {formatMoney(item.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </ReceiptCard>
            {/* tangerine scan-line sweeping over the receipt */}
            <span className="scan-line" aria-hidden="true" />
          </div>

          <div
            className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted-ink"
            role="status"
            aria-live="polite"
          >
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tangerine [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tangerine [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tangerine" />
            </span>
            Reading line items…
          </div>
        </div>
      </div>
    )
  }

  if (!scanned) {
    return (
      <div className="flex min-h-full flex-col px-5 pb-6 pt-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">
            New split
          </h1>
          <p className="mt-1 text-sm text-muted-ink">
            Start by snapping the receipt — we&apos;ll pull out the items.
          </p>
        </div>

        {/* Centered, inviting dropzone fills the available space */}
        <div className="flex flex-1 flex-col justify-center py-6">
          <button
            type="button"
            onClick={handleScan}
            className="group relative flex w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed border-leader bg-receipt px-6 py-14 text-ink shadow-[0_16px_40px_-24px_rgba(11,83,65,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:border-tangerine hover:bg-secondary hover:shadow-[0_22px_48px_-24px_rgba(255,138,43,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
          >
            {/* faint receipt watermark */}
            <ReceiptText
              className="pointer-events-none absolute -right-4 -top-3 h-28 w-28 rotate-12 text-leader/40"
              strokeWidth={1.4}
              aria-hidden="true"
            />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-tangerine text-ink shadow-[0_12px_24px_-10px_rgba(255,138,43,0.8)] transition-transform duration-200 group-hover:scale-105">
              <Camera className="h-9 w-9" strokeWidth={2.2} />
            </span>
            <span className="relative text-lg font-semibold">
              Snap a receipt
            </span>
            <span className="relative text-sm text-muted-ink">
              Tap to use your camera
            </span>
          </button>

          <button
            type="button"
            onClick={handleScan}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-ink transition-colors hover:text-ink"
          >
            <Upload className="h-4 w-4" strokeWidth={2.2} />
            or upload from files
          </button>
        </div>

        {/* How it works strip with dotted connector */}
        <div className="rounded-2xl border border-hairline bg-receipt/60 px-5 py-4">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-ink">
            How it works
          </p>
          <div className="flex items-start justify-between">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.label} className="flex flex-1 items-start">
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-spruce">
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <span className="text-[11px] font-medium text-muted-ink">
                      {step.label}
                    </span>
                  </div>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <span
                      className="mt-5 h-0 flex-1 border-t-2 border-dotted border-leader"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col px-4 pb-4 pt-4">
      <div className="px-1">
        <h1 className="font-heading text-2xl font-bold text-ink">
          Check the details
        </h1>
        <p className="mt-1 text-sm text-muted-ink">
          Fix anything that looks off, then start splitting.
        </p>
      </div>

      <div className="mt-5 flex-1">
        <ReceiptCard className="mx-auto max-w-md rounded-[20px]">
          <div className="mt-5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-ink">
              Line items
            </span>
            <span className="font-mono text-[11px] text-muted-ink">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <ul className="mt-2 flex flex-col gap-1.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="group flex items-center gap-2 rounded-xl px-1 py-1.5"
              >
                <input
                  value={item.label}
                  onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                  placeholder="Item name"
                  aria-label="Item name"
                  className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-transparent bg-secondary px-3 py-2 font-medium text-ink outline-none transition-colors focus:border-tangerine"
                />
                <div className="flex items-center rounded-lg border border-transparent bg-secondary pl-2.5 transition-colors focus-within:border-tangerine">
                  <span className="font-mono text-muted-ink">$</span>
                  <input
                    value={item.price}
                    inputMode="decimal"
                    onChange={(e) =>
                      updateItem(item.id, 'price', e.target.value)
                    }
                    aria-label="Item price"
                    className="min-h-[44px] w-16 bg-transparent px-1 text-right font-mono tabular-nums text-ink outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.label || 'item'}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-ink transition-colors hover:bg-leader/40 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={addItem}
            className="mt-2 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-tangerine transition-colors hover:bg-tangerine/10"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add item
          </button>

          <hr className="tear-line my-5" />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-ink">Subtotal</span>
              <span className="font-mono tabular-nums text-ink">
                {formatMoney(subtotal)}
              </span>
            </div>
            <EditableTotal label="Tax" value={tax} onChange={setTax} />
            <EditableTotal label="Tip" value={tip} onChange={setTip} />
            <div className="mt-1 flex items-center justify-between border-t border-leader pt-3">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-mono text-lg font-semibold tabular-nums text-ink">
                {formatMoney(total)}
              </span>
            </div>
          </div>
        </ReceiptCard>
      </div>

      {/* Pinned CTA — always reachable at the bottom of the frame */}
      <div className="sticky bottom-0 z-10 mx-auto mt-4 w-full max-w-md bg-gradient-to-t from-canvas via-canvas to-transparent pb-1 pt-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-full bg-tangerine px-7 py-4 text-base font-semibold text-ink shadow-[0_12px_28px_-12px_rgba(255,138,43,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Start splitting
        </button>
      </div>
    </div>
  )
}

function EditableTotal({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-ink">{label}</span>
      <div className="flex items-center rounded-lg border border-transparent bg-secondary pl-2.5 transition-colors focus-within:border-tangerine">
        <span className="font-mono text-muted-ink">$</span>
        <input
          value={value}
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="min-h-[40px] w-16 bg-transparent px-1 text-right font-mono tabular-nums text-ink outline-none"
        />
      </div>
    </div>
  )
}
