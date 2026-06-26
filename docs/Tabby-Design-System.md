# Tabby — Design System ("Receipt, reissued")

**Direction in one line:** The receipt is Tabby's hero object, reimagined as a crafted, tactile ticket — crisp white paper lifting off a deep spruce-emerald field, with one warm tangerine accent and monospaced money. Friendly enough for friends, precise enough for money.

**Deliberately *not*:** the cream-paper + serif + terracotta look (the current default for consumer/fintech concepts), the black-canvas + single-acid-accent look, or the hairline-broadsheet look. Every choice below is grounded in receipts, restaurants, and the social money moment.

---

## 1. Color tokens

| Token | Hex | Role |
|---|---|---|
| `--canvas` | `#0B5341` | App background — deep spruce/emerald field (the "guest-check" green, used as a rich dark surface) |
| `--canvas-deep` | `#073C2E` | Darker emerald for depth, headers, gradient base |
| `--paper` | `#FFFFFF` | Receipt card surface — crisp, bright, "reissued" |
| `--paper-tint` | `#F6F3EC` | Subtle warm row tint on the receipt (zebra striping only — never the dominant surface) |
| `--ink` | `#16140F` | Primary text + receipt structure (warm near-black, never pure #000) |
| `--ink-muted` | `#6B6356` | Secondary text, captions, metadata |
| `--tangerine` | `#FF8A2B` | THE accent — primary actions, claimed items, "you're owed", focus |
| `--tangerine-deep` | `#E8740F` | Tangerine pressed/hover, accent text on paper where contrast needed |
| `--mint` | `#6FE0AC` | Success — "settled / paid" badges and confirmation states |
| `--line` | `#DAD3C4` | Warm gray — dotted leaders, dividers, hairlines on paper |

**Usage rules**
- **Primary buttons = tangerine fill + INK text** (dark text on bright orange is both higher-contrast and more crafted than white-on-orange).
- **Body text = ink on paper**, never colored. Tangerine is for interaction and money-owed, not paragraphs.
- **On the emerald canvas**, only use white text and white cards; never set small body text directly on emerald.
- **Mint** is reserved for the "done" feeling (settled, paid) — don't dilute it by using it elsewhere.

---

## 2. Typography

Three faces, three jobs. All available via `next/font/google` (or the `geist` package for Geist/Geist Mono).

| Role | Face | Weights | Where |
|---|---|---|---|
| **Display** | Bricolage Grotesque | 700 / 800 | Wordmark, hero, section headers — used with restraint |
| **UI / Body** | Geist | 400 / 500 / 600 | All interface text, labels, paragraphs (on-brand nod to Vercel) |
| **Data / Money** | Geist Mono | 500 / 600 | Every price, subtotal, tax, tip, total — `font-variant-numeric: tabular-nums` |

**Type scale (mobile-first, fluid)**

| Name | Size | Face / treatment |
|---|---|---|
| Display | `clamp(2.25rem, 8vw, 3.25rem)` | Bricolage 800, tracking `-0.02em`, line-height 0.98 |
| H2 | `clamp(1.5rem, 4vw, 2rem)` | Bricolage 700, tracking `-0.01em` |
| H3 | `1.25rem` | Bricolage 700 |
| Lead | `1.125rem` | Geist 400 |
| Body | `1rem` | Geist 400, line-height 1.5 |
| Body S | `0.875rem` | Geist 400/500 |
| Eyebrow | `0.75rem` | Geist 600, UPPERCASE, tracking `0.12em`, color `--ink-muted` |
| Money | `1.125rem` | Geist Mono 600, tabular-nums |
| Money total | `clamp(2rem, 7vw, 2.75rem)` | Geist Mono 600, tabular-nums |

**Rule:** any number that represents currency uses Geist Mono with tabular figures so columns align down the receipt. Never set prices in the body sans.

---

## 3. Spacing, radius, elevation, motion

**Spacing** (4px base): `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Default card padding 20–24px; comfortable row height ≥ 56px (thumb-friendly).

**Radius**
| Token | Value | Use |
|---|---|---|
| `--r-card` | `20px` | Receipt cards, sheets, modals |
| `--r-field` | `14px` | Inputs, secondary buttons |
| `--r-pill` | `999px` | Primary buttons, chips, member avatars |

> The *receipt* card's top/bottom edges are **perforated (scalloped), not rounded** — see §4. Radius tokens apply to everything else.

**Elevation** (warm shadows so white paper reads as physical, lifting off emerald)
- `--e1`: `0 1px 2px rgba(7,40,30,.18)` — chips, resting rows
- `--e2`: `0 10px 28px -10px rgba(6,30,22,.40), 0 2px 6px rgba(6,30,22,.16)` — receipt cards, sheets
- `--e-press`: inset `0 2px 4px rgba(6,30,22,.18)` — pressed state

**Motion**
- Easings: `--ease-out: cubic-bezier(.2,.7,.2,1)`; `--ease-spring: cubic-bezier(.2,.9,.25,1.2)` (claim pop only).
- Durations: tap `120ms`, reveal `220ms`, receipt print stagger `~40ms/row`.
- **Always** honor `prefers-reduced-motion`: drop staggers/springs, keep a simple fade.

---

## 4. Signature element — the live receipt card

This is the one memorable thing. Spend the design budget here; keep everything around it quiet.

**Anatomy (top → bottom):**
1. **Perforated top edge** — scalloped cut-out in the emerald canvas color.
2. **Header band** — Tabby wordmark (Bricolage), merchant name, date/"table" line in `--ink-muted` eyebrow style. Optional faint barcode/serial flourish on the right.
3. **Item rows** — each row: `label` (Geist) · **dotted leader line** (`--line`) · `price` (Geist Mono). Rows are tappable.
4. **Claimed state** — tapped row gets a soft tangerine tint, the price/label nudge to tangerine-deep, and the claimer's **initial chip** (tangerine pill, ink letter) appears at the right. Multiple claimers = multiple chips; "split N ways" caption shows the per-person share.
5. **Unclaimed flag** — rows with zero claimers show a quiet "unclaimed" tag; settle-up warns if any remain.
6. **Tear line** — a perforated divider above the totals (dotted rule + tiny notch on each side).
7. **Totals block** — subtotal, tax, tip (with the proportional split note), then **TOTAL** in the big mono total style.
8. **Perforated bottom edge** — matching scallop.

**Micro-interactions:** rows "print in" sequentially on load (thermal-print reveal). Claiming a row = quick spring scale + a tangerine fill sweep + the initial chip popping in (a satisfying "stamp"). On settle-up, a **PAID/SETTLED** mark stamps in mint.

---

## 5. Core components

- **Primary button** — pill, `--tangerine` fill, **ink** label, Geist 600, padding `14px 22px`, `--e1`; press = `--tangerine-deep` + `--e-press` + translateY(1px). Labels say exactly what happens: "Snap a receipt", "Start splitting", "Settle up", "Pay with Venmo".
- **Secondary button** — `--r-field`, paper fill, 1px `--line` border, ink label; for low-emphasis actions ("Add item", "Edit").
- **Member avatar / chip** — `--r-pill`, tangerine (claimer) or emerald-tint (member) circle with a single initial in contrasting ink/white; size 28–32px.
- **Item row** — see §4; resting, hover (faint tint), claimed (tangerine tint + chips), unclaimed (muted tag).
- **Badge** — "Settled" = mint fill + ink text, pill; "Owed" = tangerine outline + tangerine-deep text.
- **Input** — `--r-field`, paper, 1px `--line`, ink text; focus = 2px tangerine ring (offset 2px). Money inputs use Geist Mono.
- **App bar** — emerald (`--canvas-deep`) with white wordmark; minimal, sticky; primary action floats as a pill.
- **Share sheet / QR** — white card on emerald; big copy-link pill + QR; "Join with just your name" reassurance line.

---

## 6. Motion choreography (where animation earns its place)

1. **Receipt load:** rows print top-to-bottom, `~40ms` stagger, fade+slide 6px. One orchestrated moment, not scattered effects.
2. **Claim:** spring pop on the row + tangerine sweep + chip stamp (`--ease-spring`, 180ms).
3. **Live update from others:** a new claimer's chip slides in with a soft pulse; optional tiny activity ticker ("Dana claimed the nachos").
4. **Settle-up:** totals tear/print, then a mint "SETTLED" stamp.

Reduced motion: replace all of the above with simple opacity fades.

---

## 7. Voice & microcopy

Plain, active, a little witty — never apologetic. Copy is signposting, not flavor.

| Moment | Say | Not |
|---|---|---|
| Empty state | "No receipt yet. Snap one to start the tab." | "You have no items." |
| Primary CTA | "Snap a receipt" → "Start splitting" → "Settle up" | "Submit" / "Continue" |
| Owed | "Dana owes you **$24.60**" | "Outstanding balance" |
| Settled | "Settled." | "Transaction complete." |
| OCR fail | "Couldn't read that one — add the items by hand?" | "Error: parsing failed." |
| Unclaimed | "2 items still need an owner." | "Validation warning." |

A button keeps its verb through the flow: "Pay with Venmo" → toast "Sent to Venmo." Sentence case everywhere. Name things by what people do, not how the system works.

---

## 8. Accessibility floor (non-negotiable)

- Body text is ink-on-paper (~16:1). Never put small text on emerald or on tangerine.
- Tangerine elements use ink text/icons; mint uses ink text.
- Visible focus: 2px tangerine ring, 2px offset, on every interactive element.
- Tap targets ≥ 44px; rows ≥ 56px.
- Respect `prefers-reduced-motion`. Fully usable by keyboard. Color is never the *only* signal (claimed rows also show chips + a checkmark).

---

## 9. Paste-into-v0 starter

**CSS variables**
```css
:root{
  --canvas:#0B5341; --canvas-deep:#073C2E;
  --paper:#FFFFFF; --paper-tint:#F6F3EC;
  --ink:#16140F; --ink-muted:#6B6356;
  --tangerine:#FF8A2B; --tangerine-deep:#E8740F;
  --mint:#6FE0AC; --line:#DAD3C4;
  --r-card:20px; --r-field:14px; --r-pill:999px;
  --e1:0 1px 2px rgba(7,40,30,.18);
  --e2:0 10px 28px -10px rgba(6,30,22,.40), 0 2px 6px rgba(6,30,22,.16);
  --ease-out:cubic-bezier(.2,.7,.2,1);
  --ease-spring:cubic-bezier(.2,.9,.25,1.2);
}
```

**Tailwind theme extension**
```js
theme: { extend: {
  colors: {
    canvas:{DEFAULT:'#0B5341', deep:'#073C2E'},
    paper:{DEFAULT:'#FFFFFF', tint:'#F6F3EC'},
    ink:{DEFAULT:'#16140F', muted:'#6B6356'},
    tangerine:{DEFAULT:'#FF8A2B', deep:'#E8740F'},
    mint:'#6FE0AC', line:'#DAD3C4',
  },
  borderRadius:{ card:'20px', field:'14px' },
  fontFamily:{
    display:['"Bricolage Grotesque"','sans-serif'],
    sans:['Geist','sans-serif'],
    mono:['"Geist Mono"','monospace'],
  },
}}
```

**One-line brief for v0:** "Mobile-first bill-splitting app. Deep spruce-emerald background (#0B5341); content lives on crisp white *receipt* cards with perforated (scalloped) top/bottom edges, dotted leader lines from each item label to its price, and a tear line above the total. Bricolage Grotesque for headings, Geist for UI, Geist Mono (tabular) for all money. Single tangerine accent (#FF8A2B) for primary buttons and claimed items, mint (#6FE0AC) for 'settled'. Pill buttons with ink text on tangerine. Tactile, crafted, friendly — not corporate."
