import { TabbyApp } from '@/components/tabby/tabby-app'

export default function Home() {
  return (
    <div
      className="min-h-screen sm:flex sm:items-start sm:justify-center sm:px-0 sm:py-6"
      style={{
        background:
          'linear-gradient(to bottom, #EEF2EF 0%, #E7EDE9 100%)',
      }}
    >
      <TabbyApp />
    </div>
  )
}
