'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Plus, Trash2 } from 'lucide-react'
import { formatMoney } from '@/lib/tabby-data'

// Neutral skeleton rows shown while the real receipt is being read — varied
// widths for a realistic shimmer, with NO placeholder merchant or items.
const SKELETON_ROWS = ['w-40', 'w-28', 'w-36', 'w-24', 'w-32']
import {
  createSession,
  presignUpload,
  uploadToS3,
  parseReceipt,
  createExpense,
} from '@/lib/api/tabby-client'
import { ReceiptCard } from './receipt-card'

type EditItem = { id: string; label: string; price: string }

export function CaptureScreen({
  sessionId,
  onSession,
  onStart,
}: {
  sessionId: string | null
  onSession: (sessionId: string, meId: string) => void
  onStart: () => void
}) {
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [items, setItems] = useState<EditItem[]>([])
  const [merchant, setMerchant] = useState<string | null>(null)
  const [tax, setTax] = useState('0.00')
  const [tip, setTip] = useState('0.00')
  // Object URL of the actual uploaded image, shown (with the scan-line) while
  // the real receipt is being read.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Holds the session id synchronously within the scan pipeline (the lifted
  // sessionId prop may not have re-rendered yet when "Start splitting" fires).
  const liveSessionId = useRef<string | null>(null)

  // Revoke the preview object URL when it changes or on unmount (no leaks).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleScan() {
    fileRef.current?.click()
  }

  // Drop the user into a blank, editable receipt — the flow never dead-ends.
  function fallbackToEmpty() {
    setItems([])
    setMerchant(null)
    setTax('0.00')
    setTip('0.00')
    setScanned(true)
    setScanning(false)
  }

  // Real pipeline: create session -> presign -> PUT to S3 -> OCR parse.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    // Show the real receipt the user just picked while we read it.
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setScanning(true)

    const created = await createSession()
    if (!created.ok) return fallbackToEmpty()
    const sid = created.data.id
    liveSessionId.current = sid
    onSession(sid, created.data.hostMemberId)

    const presign = await presignUpload({
      sessionId: sid,
      contentType: file.type,
      size: file.size,
    })
    if (!presign.ok) return fallbackToEmpty()

    const uploaded = await uploadToS3(presign.data.uploadUrl, file)
    if (!uploaded) return fallbackToEmpty()

    const parsed = await parseReceipt(sid, presign.data.objectKey)
    if (!parsed.ok) return fallbackToEmpty()

    const receipt = parsed.data.receipt
    setMerchant(receipt.merchant)
    setItems(
      receipt.items.map((it, i) => ({
        id: `p${i}`,
        label: it.label,
        price: (it.unitPrice * (it.qty || 1)).toFixed(2),
      })),
    )
    setTax((receipt.tax ?? 0).toFixed(2))
    setTip((receipt.tip ?? 0).toFixed(2))
    setScanned(true)
    setScanning(false)
  }

  // "Start splitting": persist the reviewed receipt as the session's expense,
  // then continue to the invite sheet. If there's no live session (offline /
  // fallback), proceed anyway so the mock demo path stays intact.
  async function handleStart() {
    const sid = sessionId ?? liveSessionId.current
    if (sid && items.length > 0) {
      await createExpense(sid, {
        merchant,
        items: items.map((it) => ({
          label: it.label.trim() || 'Item',
          qty: 1,
          unitPrice: Number(it.price) || 0,
        })),
        tax: Number(tax) || 0,
        tip: Number(tip) || 0,
      })
    }
    onStart()
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

  if (scanning) {
    return (
      <div className="px-4 pb-6 pt-4">
        <div className="px-1">
          <h1 className="font-heading text-2xl font-bold text-ink">
            Reading your receipt…
          </h1>
          <p className="mt-1 text-sm text-muted-ink">
            Hang tight — we&apos;re pulling out the line items.
          </p>
        </div>

        <div className="relative mx-auto mt-6 max-w-md overflow-hidden rounded-[20px]">
          {previewUrl ? (
            // The actual uploaded receipt, with the scan-line sweeping over it.
            <div className="overflow-hidden rounded-[20px] border border-hairline bg-receipt shadow-[0_16px_40px_-20px_rgba(11,83,65,0.28)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Your receipt, being scanned"
                className="max-h-[420px] w-full object-contain"
              />
            </div>
          ) : (
            <ReceiptCard className="rounded-[20px]">
              <ul className="mt-6 flex flex-col gap-4">
                {SKELETON_ROWS.map((width, i) => (
                  <li
                    key={i}
                    className="shimmer-row flex items-center justify-between gap-3"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  >
                    <span
                      className={`h-3.5 rounded-full bg-leader/60 ${width}`}
                    />
                    <span className="h-3.5 w-12 rounded-full bg-leader/60" />
                  </li>
                ))}
              </ul>
            </ReceiptCard>
          )}
          {/* tangerine scan-line sweeping over the receipt */}
          <span className="scan-line" aria-hidden="true" />
        </div>

        <p
          className="mt-5 text-center text-sm font-medium text-muted-ink"
          role="status"
          aria-live="polite"
        >
          Reading your receipt…
        </p>
      </div>
    )
  }

  if (!scanned) {
    return (
      <div className="px-5 pb-6 pt-4">
        <h1 className="font-heading text-2xl font-bold text-ink">
          New split
        </h1>
        <p className="mt-1 text-sm text-muted-ink">
          Start by snapping the receipt — we&apos;ll pull out the items.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={handleScan}
          className="mt-8 flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-leader bg-receipt px-6 py-16 text-ink shadow-[0_16px_40px_-24px_rgba(11,83,65,0.28)] transition-colors hover:border-tangerine hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tangerine text-ink">
            <Camera className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold">Snap a receipt</span>
          <span className="text-sm text-muted-ink">
            Tap to use your camera or upload a photo
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="px-1">
        <h1 className="font-heading text-2xl font-bold text-ink">
          Check the details
        </h1>
        <p className="mt-1 text-sm text-muted-ink">
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
            onClick={handleStart}
            className="w-full rounded-full bg-tangerine px-7 py-4 text-base font-semibold text-ink shadow-[0_12px_28px_-12px_rgba(255,138,43,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
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
