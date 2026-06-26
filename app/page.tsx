import { TabbyApp } from '@/components/tabby/tabby-app'

type Screen = 'landing' | 'capture' | 'claim' | 'settle'
const VALID: Screen[] = ['landing', 'capture', 'claim', 'settle']

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>
}) {
  const { screen } = await searchParams
  const initialScreen = (
    VALID.includes(screen as Screen) ? screen : 'landing'
  ) as Screen

  return (
    <div
      className="flex h-full items-stretch bg-canvas sm:items-center sm:justify-center"
      style={{
        background:
          'linear-gradient(to bottom, #EEF2EF 0%, #E7EDE9 100%)',
      }}
    >
      <TabbyApp initialScreen={initialScreen} />
    </div>
  )
}
