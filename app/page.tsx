import { TabbyApp } from '@/components/tabby/tabby-app'

type Screen = 'landing' | 'capture' | 'claim' | 'settle'
const VALID: Screen[] = ['landing', 'capture', 'claim', 'settle']

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string; s?: string; m?: string }>
}) {
  const { screen, s, m } = await searchParams
  const initialScreen = (
    VALID.includes(screen as Screen) ? screen : 'landing'
  ) as Screen

  // Optional deep-link session (e.g. opening a past split from /history).
  const initialSessionId = typeof s === 'string' && s ? s : null
  const initialMeId = typeof m === 'string' && m ? m : null

  return (
    <div
      className="flex h-full items-stretch bg-canvas sm:items-center sm:justify-center"
      style={{
        background:
          'linear-gradient(to bottom, #EEF2EF 0%, #E7EDE9 100%)',
      }}
    >
      <TabbyApp
        initialScreen={initialScreen}
        initialSessionId={initialSessionId}
        initialMeId={initialMeId}
      />
    </div>
  )
}
