'use client'

import { useEffect, useState } from 'react'
import { SignInButton, useUser } from '@clerk/nextjs'
import { Check } from 'lucide-react'
import { clerkEnabled } from '@/lib/auth/clerk-flags'
import {
  AccountScreenFrame,
  SignedOutNotice,
} from '@/components/auth/account-screen-frame'
import { getMyProfile, updateMyProfile } from '@/lib/api/tabby-client'
import { PROVIDER_LABEL } from '@/lib/domain/payment-links'
import type { PaymentProvider } from '@/lib/types/tabby'

export default function ProfilePage() {
  return (
    <AccountScreenFrame title="Your profile">
      {!clerkEnabled ? (
        <SignedOutNotice message="Profiles need sign-in, which isn't configured here." />
      ) : (
        <ProfileGate />
      )}
    </AccountScreenFrame>
  )
}

function ProfileGate() {
  const { isLoaded, isSignedIn } = useUser()
  if (!isLoaded) {
    return <p className="mt-6 text-sm text-muted-ink">Loading…</p>
  }
  if (!isSignedIn) {
    return (
      <div className="mt-4">
        <SignedOutNotice message="Sign in to set up your profile." />
        <SignInButton mode="modal">
          <button
            type="button"
            className="mt-4 rounded-full bg-tangerine px-5 py-2.5 text-sm font-semibold text-ink"
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    )
  }
  return <ProfileForm />
}

const PROVIDERS: PaymentProvider[] = ['venmo', 'cashapp', 'paypal']

function ProfileForm() {
  const [loaded, setLoaded] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [provider, setProvider] = useState<PaymentProvider>('venmo')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void getMyProfile().then((res) => {
      if (cancelled) return
      if (res.ok && res.data.profile) {
        setDisplayName(res.data.profile.displayName ?? '')
        if (res.data.profile.paymentHandle) {
          setProvider(res.data.profile.paymentHandle.provider)
          setUsername(res.data.profile.paymentHandle.username)
        }
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    const res = await updateMyProfile({
      displayName: displayName.trim() || null,
      paymentHandle: username.trim()
        ? { provider, username: username.trim() }
        : null,
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } else {
      setError(res.error)
    }
  }

  if (!loaded) {
    return <p className="mt-6 text-sm text-muted-ink">Loading your profile…</p>
  }

  return (
    <div className="mt-5 flex flex-col gap-5">
      <p className="text-sm text-muted-ink">
        Your default payment handle prefills the “Pay” links whenever you’re the
        one who covered the bill.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Display name</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Faisal"
          maxLength={40}
          className="min-h-[48px] rounded-2xl border border-hairline bg-receipt px-4 py-3 font-medium text-ink outline-none transition-colors focus:border-tangerine"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Default payment</span>
        <div className="flex gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              className={
                provider === p
                  ? 'flex-1 rounded-full bg-spruce px-3 py-2 text-sm font-semibold text-receipt'
                  : 'flex-1 rounded-full border border-hairline bg-receipt px-3 py-2 text-sm font-semibold text-muted-ink transition-colors hover:text-ink'
              }
            >
              {PROVIDER_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="mt-1 flex items-center rounded-2xl border border-hairline bg-receipt px-4 focus-within:border-tangerine">
          <span className="font-mono text-muted-ink">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-username"
            maxLength={64}
            autoCapitalize="none"
            autoCorrect="off"
            className="min-h-[48px] flex-1 bg-transparent px-2 font-mono text-ink outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-tangerine-deep">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-full bg-tangerine px-7 py-3.5 text-base font-semibold text-ink shadow-[0_12px_28px_-12px_rgba(255,138,43,0.7)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tangerine disabled:opacity-60"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Saved
          </>
        ) : saving ? (
          'Saving…'
        ) : (
          'Save profile'
        )}
      </button>
    </div>
  )
}
