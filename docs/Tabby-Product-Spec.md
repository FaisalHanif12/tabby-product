# Tabby — Product Specification
*Document 2 of 3 · Intro · Functional Requirements · Workflow · Architecture View*
*(Companion docs: Tabby-Design-System.md · Tabby-Tech-Stack.md)*

---

## 1. Introduction

**Tabby** turns the awkward "who owes what" moment after a group meal into a 30-second, fair, and even enjoyable interaction. Snap the receipt, everyone taps the items they had, and Tabby splits the bill — including a fair share of tax and tip — then tells each person exactly who to pay and how much, with one tap through to Venmo, Cash App, or PayPal.

**The problem.** Splitting a group bill is still broken. Splitting evenly overcharges the person who ordered modestly; itemizing by hand is tedious and socially awkward. The default tools — Venmo Groups and Splitwise — split a *lump sum* (equal or by percentage); neither reads a receipt and splits it *by line item*.

**Who it's for.** US young adults, roommates, and friend groups who eat out together and already use peer-to-peer payment apps. They want fairness without the math and without the "who had the expensive entrée?" conversation.

**Value & monetization.** Free for occasional splits; **Tabby Pro (~$3.99/mo or $29.99/yr)** unlocks unlimited groups, saved history, and multi-receipt trips. No money moves through Tabby — settlement hands off to existing payment apps via deep links — so there is **no PCI scope** and no payments licensing burden.

**Why it can win.** Built for Track 1 (Monetizable B2C) on the required Vercel + DynamoDB stack, and engineered to also contend for the four special awards. The five bars it clears:
- **Monetizable** — a proven freemium model with clear unit economics.
- **Original** — itemized, claim-based receipt splitting is an unserved gap the incumbents structurally don't fill.
- **Impactful** — saves the careful spender money and removes a near-universal social friction.
- **Technically deliberate** — a purpose-fit DynamoDB single-table model + short-lived federated AWS credentials (details in Doc 3).
- **Beautiful** — the "receipt-as-interface" design system (Doc 1).

**Scope boundary.** The 4-day MVP centers on *receipt → itemize → claim → settle*. Anything beyond that is explicitly deferred (see P1/P2 below).

---

## 2. Functional Requirements

Priority key: **P0** = must ship (the demo fails without it) · **P1** = if time allows · **P2** = stub or skip for v1.

### FR-A · Receipt capture & AI itemization — P0
- **A1 (P0)** Upload a receipt image (camera or file) from the browser.
- **A2 (P0)** A vision model extracts structured JSON: merchant, line items (label, qty, unit price), subtotal, tax, tip, total.
- **A3 (P0)** An **editable review screen** shows the parsed result; every field can be added, renamed, repriced, or deleted.
- **A4 (P0)** On low confidence or failure, drop the user into a blank editable receipt — the flow never dead-ends.
- **A5 (P1)** Store and re-view the receipt image.

*Acceptance:* a clear printed receipt populates items + subtotal + tax + total within ~10s; editing any value recomputes all dependent totals; a failed parse yields an editable empty receipt (no error wall); displayed line items + tax + tip reconcile to the total or the mismatch is flagged.

### FR-B · Session creation & joining — P0
- **B1 (P0)** "New split" creates a session and marks the creator as **payer/host** (host token stored client-side).
- **B2 (P0)** Host generates a **share link** (and QR).
- **B3 (P0)** Anyone with the link **joins by entering a display name** — no signup, no password.
- **B4 (P0)** All members are visible to everyone in the session.
- **B5 (P2)** Persistent accounts across sessions.

*Acceptance:* opening the link on a second device lets a guest join and appear for all participants; returning via the same link re-recognizes the member (no duplicate); guests cannot edit the receipt or trigger settle-up.

### FR-C · Live item claiming — P0
- **C1 (P0)** Tap to claim / untap to release any line item.
- **C2 (P0)** An item can be claimed by **multiple members**; its cost splits evenly across current claimers.
- **C3 (P0)** Each member sees a **running personal subtotal**.
- **C4 (P0)** Unclaimed items are flagged; settle-up warns if any remain.
- **C5 (P0)** Claiming is **atomic** — simultaneous claims never clobber each other.

*Acceptance:* a $30 item claimed by 3 shows $10 each; releasing recomputes remaining shares; two near-simultaneous claims both register; an unclaimed item produces a settle-up warning.

### FR-D · Fair allocation: tax & tip — P0
- **D1 (P0)** Tax distributes **in proportion to each member's claimed subtotal**.
- **D2 (P0)** Tip distributes proportionally by default; host may switch to flat split or edit the amount.
- **D3 (P0)** Member total = claimed-item share + proportional tax + proportional tip; the sum of member totals equals the receipt total to the cent.
- **D4 (P1)** Sub-cent rounding assigned deterministically so totals always reconcile.

*Acceptance:* member with $60 of a $100 subtotal and $10 tax is allocated $6 tax; Σ(member totals) == receipt total for any claim configuration.

### FR-E · Settle-up & payment hand-off — P0
- **E1 (P0)** Host triggers **Settle up**; each non-payer sees "<Name> owes <Payer> <amount>."
- **E2 (P0)** Single payer in v1 → everyone owes the payer (already the minimum number of transfers). Data model supports multi-payer later.
- **E3 (P0)** Each amount offers **deep links** to Venmo / Cash App / PayPal with amount + note prefilled, plus **Copy summary**.
- **E4 (P0)** No funds move through Tabby — explicit hand-off to existing apps.
- **E5 (P1)** Multi-payer debt-minimization (minimum set of transfers when several people paid).

*Acceptance:* settle-up renders one clear line per non-payer with the exact amount; a payment link opens with details prefilled (graceful copy fallback); the summary is human-readable.

### FR-F · Real-time sync — P0 (polling) → P1 (push)
- **F1 (P0)** A claim/release reflects on other members' screens within a few seconds (short-interval polling on the active session).
- **F2 (P1)** Replace polling with **DynamoDB Streams → push (SSE)** for instant updates + an activity ticker. *This is the technical flourish — only after P0 is solid.*

*Acceptance:* device A's claim appears on device B within ~3s with no manual refresh.

### FR-G · Identity (lightweight) — P0
- **G1 (P0)** Host = client-stored host token; guest = member id keyed to the link. No email/password in v1.
- **G2 (P2)** Optional sign-in to persist history.

### FR-H · History / "My sessions" — P1
- **H1 (P1)** A recognized user can list and reopen past sessions (read-only is fine). *Requires the user→sessions index — design it in now (Doc 3).*

### FR-I · Monetization surface — P2 (UI only)
- **I1 (P2)** A "Tabby Pro" upgrade screen exists for the pitch but gates nothing during the hackathon.

---

## 3. Workflow

### 3.1 The golden path (this is the demo)
1. Host opens Tabby → **New split** → snaps/uploads a receipt.
2. AI extracts items + tax/tip → host sees an **editable review** and corrects anything.
3. Host taps **Start splitting** → gets a **share link / QR**.
4. Friends open the link → enter a name → see the items.
5. Each person **taps the items they had**; shared plates get tapped by several (split evenly). Balances update live.
6. Host taps **Settle up** → each person's total (items + fair tax & tip share) and **"Dana owes you $24.60."**
7. Each person taps **Pay with Venmo / Cash App / PayPal** (prefilled) or copies the summary.

```
HOST                                  GUESTS
 │ New split                            │
 ▼                                      │
 Snap receipt ─► AI itemize ─► Review   │
 │ (edit if needed)                     │
 ▼                                      │
 Start splitting ─► share link / QR ───►│ Open link
                                        ▼
                                   Enter name ─► see items
                                        │
              ┌── live claiming (both sides, real-time) ──┐
              ▼                                            ▼
        tap items had                              tap items had
              └──────────────► balances update ◄──────────┘
 │
 ▼
 Settle up ─► per-person totals ─► "X owes payer $Y" ─► Pay via Venmo/Cash App
```

### 3.2 Key sub-flows
- **Host create & capture:** New split → upload → parse → review/edit → confirm → session created (host token issued).
- **Guest join:** open link → enter display name → member created → land on the live receipt.
- **Claim:** tap row → optimistic local update → atomic write → other devices reconcile within seconds; shared items show claimer chips and per-person share.
- **Settle:** host confirms all items claimed → compute per-person totals (items + proportional tax/tip) → render "who owes the payer" → deep-link payment.

### 3.3 Edge & error flows
- **OCR fails / low confidence →** editable empty receipt; user enters items by hand (no dead end).
- **Unclaimed items at settle →** warning lists them; host can claim/assign or proceed.
- **Member opens an old/expired link →** clear "this split has ended" state (guest sessions can carry a TTL).
- **Duplicate join →** same link/device re-recognizes the existing member rather than creating a new one.

---

## 4. Architecture View

A single Next.js application on Vercel is both the frontend and the backend; it talks to DynamoDB and to a Gemini vision model (via OpenRouter) for OCR. (Implementation specifics — packages, security, performance — are in Doc 3.)

### 4.1 Components & data flow
```
  Browser (mobile-first)
   │  Server Components (initial render, streamed)  +  Client Components (claim UI, share sheet)
   ▼
  Vercel · Next.js (App Router)  ───────────────────────────────────────────────
   │   Route Handlers + Server Actions = the backend
   │   ├─ receipts/parse ──► OpenRouter ──► Gemini (vision) ──► structured JSON (Zod-validated)
   │   ├─ sessions / members / items-claim ──► DynamoDB access layer
   │   └─ (P1) stream ◄── DynamoDB Streams (push to clients)
   │
   │   AWS credentials via OIDC (short-lived IAM role — no stored keys)
   ▼
  Amazon DynamoDB · single table "Tabby"
   • PK/SK access patterns  ·  GSI1 (member → sessions)  ·  TTL (expire guests)  ·  on-demand capacity
```

### 4.2 The four core operations
- **Create session** → `POST` writes session META + host MEMBER; returns the share id.
- **Parse receipt** → `POST` image → OpenRouter/Gemini → Zod-validated items → written as EXPENSE + ITEM rows.
- **Claim item** → atomic set update on the ITEM row (`claimedBy`); live sync via polling (P0) or Streams (P1).
- **Settle** → read the whole session in one query, compute fair shares in app code, render who-owes-whom + payment deep links.

### 4.3 DynamoDB single-table model (at a glance)
| Entity | PK | SK | Notes |
|---|---|---|---|
| Session meta | `GROUP#<id>` | `META` | payerId, currency, status, version, `expiresAt` (TTL) |
| Member | `GROUP#<id>` | `MEMBER#<memberId>` | displayName, isHost |
| Expense (receipt) | `GROUP#<id>` | `EXPENSE#<expenseId>` | merchant, subtotal, tax, tip, total |
| Line item | `GROUP#<id>` | `ITEM#<expenseId>#<itemId>` | label, unitPrice, qty, `claimedBy` (set), splitType |
| Settlement | `GROUP#<id>` | `SETTLEMENT#<ts>` | computed transfers |

**Access patterns:** load a whole session in one `Query` on `GROUP#<id>` (no joins); claim/release via one atomic `UpdateItem`; (P1) list a member's sessions via **GSI1** (`GSI1PK = MEMBER#<memberId>`). Every core action is a single-key read or an atomic single-item write — which is exactly why DynamoDB is the right database here.

> This view is the basis for the **architecture diagram** required in the submission. Doc 3 covers how each piece is implemented securely and performantly.
