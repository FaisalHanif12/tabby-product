'use client'

import { useState } from 'react'
import { Camera, Plus, Trash2 } from 'lucide-react'
import {
  PARSED_ITEMS,
  TAX_RATE,
  TIP_RATE,
  formatMoney,
} from '@/lib/tabby-data'
import { ReceiptCard } from './receipt-card'

type EditItem = { id: string; label: string; price: string }

export function CaptureScreen({ onStart }: { onStart: () => void }) {
  const [scanned, setScanned] = useState(false)
  const [items, setItems] = useState<EditItem[]>([])
  const [tax, setTax] = useState('0.00')
  const [tip, setTip] = useState('0.00')

  function handleScan() {
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
  }

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

  if (!scanned) {
    return (
      <div className="px-5 pb-28 pt-6">
        <h1 className="font-heading text-2xl font-bold text-receipt">
          New split
        </h1>
        <p className="mt-1 text-sm text-receipt/70">
          Start by snapping the receipt — we&apos;ll pull out the items.
        </p>

        <button
          type="button"
          onClick={handleScan}
          className="mt-8 flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-receipt/40 bg-receipt/5 px-6 py-16 text-receipt transition-colors hover:border-tangerine hover:bg-receipt/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tangerine text-ink">
            <Camera className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold">Snap a receipt</span>
          <span className="text-sm text-receipt/60">
            Tap to use your camera or upload a photo
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pb-28 pt-6">
      <div className="px-1">
        <h1 className="font-heading text-2xl font-bold text-receipt">
          Check the details
        </h1>
        <p className="mt-1 text-sm text-receipt/70">
          Fix anything that looks off, then start splitting.
        </p>
      </div>

      <div className="mt-6">
        <ReceiptCard className="mx-auto max-w-md rounded-[20px]">
          <ul className="mt-6 flex flex-col gap-1.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-xl px-1 py-1.5"
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-ink transition-colors hover:bg-leader/40 hover:text-ink"
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

        <div className="mx-auto mt-6 max-w-md">
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-full bg-tangerine px-7 py-4 text-base font-semibold text-ink transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-spruce"
          >
            Start splitting
          </button>
        </div>
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
