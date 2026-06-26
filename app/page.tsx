import { TabbyApp } from '@/components/tabby/tabby-app'

export default function Home() {
  return (
    <div
      className="flex h-full items-stretch bg-canvas sm:items-center sm:justify-center"
      style={{
        background:
          'linear-gradient(to bottom, #EEF2EF 0%, #E7EDE9 100%)',
      }}
    >
      <TabbyApp />
    </div>
  )
}
