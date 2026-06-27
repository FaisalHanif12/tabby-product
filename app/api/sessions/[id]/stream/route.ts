import { getSessionView } from '@/lib/db/repository'

export const runtime = 'nodejs'
// Long-lived SSE connection; cap it so serverless functions don't hang forever.
export const maxDuration = 60

/**
 * GET /api/sessions/[id]/stream  (P1)
 *
 * Server-Sent Events fallback for live updates. Polls the session version on an
 * interval and pushes a `change` event only when it advances, so clients can
 * subscribe with EventSource instead of polling from the browser. The richer
 * client hook (`useSession`) still works via plain polling; this is the
 * server-push upgrade path and is intentionally lightweight for now.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const encoder = new TextEncoder()
  let lastVersion = -1
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }

      send('open', { id })

      const tick = async () => {
        if (closed) return
        try {
          const view = await getSessionView(id)
          const version = view.meta?.version ?? 0
          if (version !== lastVersion) {
            lastVersion = version
            send('change', { version, status: view.meta?.status ?? null })
          } else {
            // Heartbeat keeps intermediaries from closing an idle connection.
            send('ping', { t: Date.now() })
          }
        } catch {
          send('error', { message: 'stream read failed' })
        }
      }

      await tick()
      const interval = setInterval(tick, 3000)

      // Stop when the function's deadline approaches.
      const stop = setTimeout(() => {
        closed = true
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }, (maxDuration - 2) * 1000)

      // Best-effort cleanup if the runtime cancels the stream.
      ;(controller as unknown as { _cleanup?: () => void })._cleanup = () => {
        closed = true
        clearInterval(interval)
        clearTimeout(stop)
      }
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
