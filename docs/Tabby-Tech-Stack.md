# Tabby — Tech Stack & Engineering Best Practices
*Document 3 of 3 · Tech Stack · Scalable · Flexible · Next.js Best Practices*
*(Companion docs: Tabby-Design-System.md · Tabby-Product-Spec.md)*

---

## 1. Runtime model: one Next.js app

Tabby is a **single Next.js (App Router) application** deployed on Vercel — it is *both* the frontend and the backend. "The server" means Next.js's own server side:

- **Server Components** — fetch data and render on the server (fast first paint, minimal client JS).
- **Route Handlers** (`app/api/*`) — the HTTP endpoints the client calls (create session, claim, parse receipt).
- **Server Actions** — server mutations callable straight from components.

There is **no separate backend service** to build, host, or deploy. DynamoDB access and the OCR call run only on the server side and are never shipped to the browser.

---

## 2. Tech stack

| Layer | Choice | Package(s) |
|---|---|---|
| Framework | Next.js 16 · App Router · TypeScript | `next@16`, `react@19`, `typescript` |
| Hosting | Vercel | — |
| Database | Amazon DynamoDB (single-table) | `@aws-sdk/client-dynamodb@3`, `@aws-sdk/lib-dynamodb@3` |
| AWS auth | Vercel ↔ AWS **OIDC** (short-lived IAM role, no static keys) | `@vercel/oidc-aws-credentials-provider` |
| **Receipt OCR** | **Gemini (vision) via OpenRouter**, called through the AI SDK | `ai`, `@openrouter/ai-sdk-provider`, `zod` |
| Validation | Zod (shared client + server schemas) | `zod` |
| UI | Tailwind CSS + shadcn/ui primitives | `tailwindcss`, `shadcn/ui` |
| Fonts | Geist + Geist Mono + Bricolage Grotesque via `next/font` | `geist` |
| IDs / QR | unguessable session ids + share QR | `nanoid`, `qrcode` |
| Rate limiting (P1) | protect the AI + claim endpoints | `@upstash/ratelimit`, `@upstash/redis` |

---

## 3. Scalable

### 3.1 Directory structure
`src/`-based App Router; data access behind a repository, money logic isolated as pure functions, validation shared. Feature-aware without over-building for a 4-day MVP.

```
tabby/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                       # root shell, fonts, providers
│  │  ├─ page.tsx                         # landing → "New split"
│  │  ├─ globals.css                      # design tokens (CSS vars from Doc 1)
│  │  ├─ new/page.tsx                     # capture receipt + editable review
│  │  ├─ s/[sessionId]/
│  │  │  ├─ page.tsx                      # LIVE receipt screen (Server Component shell)
│  │  │  ├─ settle/page.tsx               # settle-up
│  │  │  └─ loading.tsx                   # streamed skeleton
│  │  └─ api/
│  │     ├─ sessions/route.ts             # POST create session
│  │     ├─ sessions/[id]/route.ts        # GET (poll) · PATCH meta (host only)
│  │     ├─ members/route.ts              # POST join (name only)
│  │     ├─ items/[id]/claim/route.ts     # POST/DELETE claim (atomic)
│  │     ├─ receipts/parse/route.ts       # POST image → OpenRouter/Gemini → JSON
│  │     └─ stream/[id]/route.ts          # (P1) SSE fed by DynamoDB Streams
│  ├─ components/
│  │  ├─ receipt/                         # ReceiptCard, ItemRow, TotalsBlock, PerforatedEdge
│  │  ├─ session/                         # MemberChips, ShareSheet, SettleSummary
│  │  └─ ui/                              # shadcn primitives
│  ├─ lib/
│  │  ├─ db/
│  │  │  ├─ client.ts                     # DynamoDBDocumentClient singleton (OIDC creds)
│  │  │  ├─ keys.ts                       # key builders: GROUP#, MEMBER#, ITEM#, ...
│  │  │  └─ repository.ts                 # access patterns: getSession, claimItem, ...
│  │  ├─ ai/parse-receipt.ts             # OpenRouter + Gemini vision → Zod-validated output
│  │  ├─ domain/
│  │  │  ├─ split.ts                      # fair-share + proportional tax/tip (PURE)
│  │  │  └─ settle.ts                     # who-owes-whom (PURE)
│  │  ├─ validation/schemas.ts           # Zod schemas shared client + server
│  │  └─ utils/                           # money formatting, id helpers
│  ├─ hooks/
│  │  ├─ useSession.ts                    # polling + optimistic state
│  │  └─ useClaim.ts                      # optimistic claim/unclaim
│  └─ types/index.ts
├─ middleware.ts                          # security headers (Edge), light routing
├─ next.config.ts
├─ tailwind.config.ts
├─ .env.local
└─ package.json
```

### 3.2 Scaling practices
- **Single-table DynamoDB** with key-based access → constant-time reads/writes regardless of data volume; whole-session reads are one `Query`.
- **On-demand capacity mode** → the table auto-scales to spiky demo traffic (and to millions) with zero provisioning, and it's a clean scaling story for judges.
- **Stateless serverless functions** → Vercel scales Route Handlers horizontally automatically; keep handlers stateless (all state lives in DynamoDB).
- **Region co-location** → run the Vercel function in the **same AWS region as the table** so each round trip stays in the single-digit-millisecond range. (Big, free latency win — easy to miss.)
- **Server-render the heavy screen** → the live session renders on the server from one query, so the client downloads little JS.
- **Atomic writes** → claims are a single atomic `UpdateItem` (no read-modify-write), so concurrency doesn't degrade under load.

---

## 4. Flexible

- **Provider-agnostic OCR via OpenRouter.** One `OPENROUTER_API_KEY` reaches hundreds of models. Switching from Gemini to any other vision model is a **one-string change** (`OCR_MODEL` env) — no re-plumbing, and trivial A/B testing or fallback if a receipt is hard to read.
- **Repository pattern** isolates all DynamoDB calls in `lib/db/repository.ts`. Screens call named functions (`getSession`, `claimItem`) and never see the SDK — you can change indexes, add caching, or swap the data layer without touching UI.
- **Pure domain logic.** `lib/domain/split.ts` and `settle.ts` are pure functions over plain data — the one place correctness *must* hold, now independently testable and reusable.
- **Zod schemas as the contract** at every boundary (client form → API → AI output → DB). Change the shape in one place; both sides stay in sync and type-safe.
- **Env-driven configuration** — model id, table name, region, and keys are all env vars, so the same code runs across local, preview, and production unchanged.

---

## 5. Receipt OCR pipeline (Gemini via OpenRouter)

Install: `npm i ai @openrouter/ai-sdk-provider zod`. Set `OPENROUTER_API_KEY` (server-only).

**The structured output schema** (shared, in `lib/validation/schemas.ts`):
```ts
import { z } from 'zod';

export const ReceiptSchema = z.object({
  merchant: z.string().nullable(),
  items: z.array(z.object({
    label: z.string(),
    qty: z.number().default(1),
    unitPrice: z.number(),
  })),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number().nullable(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;
```

**The parser** (`lib/ai/parse-receipt.ts`) — `generateObject` constrains Gemini's output to the schema; the image is passed as a multimodal message part; Response Healing repairs any malformed JSON:
```ts
import 'server-only';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { ReceiptSchema } from '@/lib/validation/schemas';

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
// Switch models by changing one env var. Verify the current slug at openrouter.ai/models.
const MODEL = process.env.OCR_MODEL ?? 'google/gemini-3.5-flash';

export async function parseReceipt(imageBase64: string, mediaType: string) {
  const { object } = await generateObject({
    model: openrouter.chat(MODEL, { plugins: [{ id: 'response-healing' }] }),
    schema: ReceiptSchema,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text:
          'Extract the merchant, every line item (label, qty, unitPrice), subtotal, tax, tip, and total from this receipt. Use null for any field not present. Prices are numbers without currency symbols.' },
        { type: 'image', image: `data:${mediaType};base64,${imageBase64}` },
      ],
    }],
  });
  return object; // already validated against ReceiptSchema
}
```

**Notes:** a *flash*-class Gemini model is the right default (fast + cheap for receipts); bump to a *pro* model via `OCR_MODEL` if some receipts need it. Compress/resize the image client-side before upload to cut latency and cost. Always pair with the FR-A4 manual-edit fallback so a bad parse never blocks the user. (If you ever prefer Vercel's own AI Gateway, the same `generateObject` call works by swapping the provider — but OpenRouter is the chosen path here.)

---

## 6. Security best practices

- **No long-lived AWS keys.** Use Vercel↔AWS **OIDC federation**: the SDK exchanges a short-lived OIDC token for temporary IAM-role credentials. Set only `AWS_ROLE_ARN` and `AWS_REGION` — never an access-key/secret pair.
- **Server-only DynamoDB client**, instantiated once at module scope (reused across warm invocations):
```ts
// src/lib/db/client.ts
import 'server-only';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

const base = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN! }),
});
export const ddb = DynamoDBDocumentClient.from(base, {
  marshallOptions: { removeUndefinedValues: true },
});
export const TABLE = process.env.TABLE_NAME ?? 'Tabby';
```
- **Least-privilege IAM role** — only the DynamoDB actions Tabby uses, on the Tabby table + its indexes:
```json
{ "Version": "2012-10-17", "Statement": [{
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem",
             "dynamodb:DeleteItem","dynamodb:Query","dynamodb:BatchWriteItem"],
  "Resource": ["arn:aws:dynamodb:*:*:table/Tabby","arn:aws:dynamodb:*:*:table/Tabby/index/*"]
}]}
```
- **All sensitive work is server-side** (DynamoDB + the OpenRouter key), enforced with `import 'server-only'` so it can't bundle to the client.
- **Validate every input with Zod** at each Route Handler / Server Action boundary — session id, member id, item id, amounts, image type/size. Never trust the client.
- **Authorization even without accounts.** Issue the host an **httpOnly cookie** token on session creation; gate host-only actions (edit receipt, settle) on it; scope claim writes to the session + the claiming member.
- **Treat the share link as a capability** — use unguessable session ids (`nanoid`, 21+ chars) so links aren't enumerable; one session can never read another. Optional TTL on guest sessions.
- **Secrets discipline** — `OPENROUTER_API_KEY` and AWS config are server-only env; never `NEXT_PUBLIC_*`. Keep `.env.local` out of git.
- **Security headers** via `next.config.ts` `headers()` or middleware: `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`.
- **Upload hygiene** — validate image MIME + size before processing; if you store images (P1), use a private S3 bucket with presigned URLs.
- **Rate-limit the expensive paths** — receipt-parse (real AI cost) and claim spam, per IP/session (`@upstash/ratelimit`; P1 but cheap insurance).
- **No PCI scope by design** — no card/bank data; settlement is deep links only. State this explicitly; it's a feature.

---

## 7. Performance best practices

- **Render the session on the server** — the live screen is a Server Component doing one `getSession` query and streaming HTML; wrap with `loading.tsx` (Suspense) for an instant skeleton.
- **Reuse the DynamoDB client** (module-scope singleton, above) so warm invocations skip client setup.
- **One query in, atomic write out** — whole-session reads are a single `Query`; claims are a single atomic `UpdateItem`: fewest round trips, no races.
- **Co-locate regions** — pin the Vercel function region to the table's AWS region (single-digit-ms round trips).
- **On-demand capacity** — auto-scales to spiky demo traffic, no provisioning.
- **Optimistic UI for claiming** — update local state on tap immediately, reconcile with the server. Poll only on the active session (~2–3s) and **pause polling when the tab is hidden** (`visibilitychange`). P1: replace polling with **SSE driven by DynamoDB Streams**.
- **Correct caching** — Next.js 15+ no longer caches `fetch` by default; session data is dynamic, so leave it uncached (always fresh); `revalidatePath` after mutations only if a cached RSC depends on it.
- **Right runtime per route** — the AWS SDK + OIDC provider need Next.js's standard server runtime (not the Edge runtime): `export const runtime = 'nodejs'` on data routes; keep `middleware.ts` light on the Edge (headers/redirects only).
- **Shrink the receipt image client-side** before upload → smaller payload, faster + cheaper parse.
- **Lean bundles** — AWS SDK v3 is modular (tree-shakeable); keep `'use client'` on leaf components only; use `next/font` (no layout shift) and `next/image` for any static imagery.

---

## 8. Environment & config

```
# .env.local  (set the same in Vercel project settings)
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/tabby-vercel
TABLE_NAME=Tabby
OPENROUTER_API_KEY=...           # server-only — Gemini routed through OpenRouter
OCR_MODEL=google/gemini-3.5-flash  # swap models without code changes
# NOTE: no AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — OIDC handles credentials
```

**Setup order:** create the DynamoDB table (on-demand) → configure the Vercel OIDC identity provider in AWS IAM → create the least-privilege role with the Vercel trust policy → set `AWS_ROLE_ARN` / `AWS_REGION` / `TABLE_NAME` / `OPENROUTER_API_KEY` in Vercel → deploy.

---

## 9. Best-practice checklist

- [ ] One Next.js app; data access + AI calls server-side only (`server-only`).
- [ ] DynamoDB single-table, on-demand, region co-located with Vercel.
- [ ] Module-scope DynamoDB client; whole-session = one Query; claims = atomic UpdateItem.
- [ ] OCR via OpenRouter + `generateObject` + Zod; model swappable by env; manual-edit fallback.
- [ ] OIDC short-lived credentials; least-privilege IAM; no stored AWS keys.
- [ ] Zod validation at every boundary; httpOnly host token; unguessable share ids.
- [ ] Security headers; secrets server-only; rate-limit the AI + claim routes (P1).
- [ ] Server-render + stream the session; optimistic claims; polling paused when hidden (Streams/SSE = P1).
- [ ] Pure split/settle logic, unit-tested; repository isolates the DB.

---

## 10. References
- Next.js App Router project structure (v16): https://nextjs.org/docs/app/getting-started/project-structure
- OpenRouter provider for the Vercel AI SDK: https://www.npmjs.com/package/@openrouter/ai-sdk-provider and https://ai-sdk.dev/providers/community-providers/openrouter
- AI SDK structured output (`generateObject`): https://vercel.com/docs/ai-sdk
- Gemini + AI SDK example (structured output with Zod): https://ai.google.dev/gemini-api/docs/vercel-ai-sdk-example
- Vercel ↔ AWS OIDC federation: https://vercel.com/docs/oidc/aws
- AWS: vibe code with AWS databases using Vercel v0 (OIDC + DynamoDB, no VPC): https://aws.amazon.com/blogs/database/vibe-code-with-aws-databases-using-vercel-v0/
