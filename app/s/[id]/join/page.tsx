import { JoinFlow } from '@/components/tabby/join-flow'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div
      className="flex h-full items-stretch bg-canvas sm:items-center sm:justify-center"
      style={{
        background: 'linear-gradient(to bottom, #EEF2EF 0%, #E7EDE9 100%)',
      }}
    >
      <JoinFlow sessionId={id} />
    </div>
  )
}
