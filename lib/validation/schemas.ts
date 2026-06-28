import { z } from 'zod'

/**
 * Shared Zod schemas for request bodies and the OCR-constrained receipt shape.
 * Note: AI SDK 6 strict mode requires `.nullable()` rather than `.optional()`
 * for model-generated objects.
 */

/* ── OCR / receipt parsing ─────────────────────────────────────────── */

export const ReceiptItemSchema = z.object({
  label: z.string().describe('The name of the line item'),
  qty: z.number().int().positive().default(1).describe('Quantity ordered'),
  unitPrice: z.number().describe('Price per unit in the receipt currency'),
})

export const ReceiptSchema = z.object({
  merchant: z.string().nullable().describe('Restaurant or merchant name'),
  items: z.array(ReceiptItemSchema).describe('Every line item on the receipt'),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number().nullable(),
})

export type Receipt = z.infer<typeof ReceiptSchema>
export type ReceiptItem = z.infer<typeof ReceiptItemSchema>

/* ── Request bodies ────────────────────────────────────────────────── */

export const CreateSessionSchema = z.object({
  hostName: z.string().trim().min(1).max(40).default('Host'),
  currency: z.string().trim().length(3).default('USD'),
})

export const PatchSessionSchema = z.object({
  tax: z.number().nonnegative().nullable().optional(),
  tip: z.number().nonnegative().nullable().optional(),
  merchant: z.string().trim().max(120).nullable().optional(),
  status: z.enum(['open', 'expensed', 'settled']).optional(),
})

export const JoinMemberSchema = z.object({
  name: z.string().trim().min(1).max(40),
})

const LineItemInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  qty: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
})

export const CreateExpenseSchema = z.object({
  merchant: z.string().trim().max(120).nullable().optional(),
  items: z.array(LineItemInputSchema).min(1),
  tax: z.number().nonnegative().default(0),
  tip: z.number().nonnegative().default(0),
  receiptKey: z.string().trim().max(512).nullable().optional(),
})

export const ClaimSchema = z.object({
  sessionId: z.string().trim().min(1),
  expenseId: z.string().trim().min(1),
  memberId: z.string().trim().min(1),
})

export const PresignSchema = z.object({
  sessionId: z.string().trim().min(1),
  contentType: z
    .string()
    .trim()
    .regex(/^image\/[a-zA-Z0-9.+-]+$/, 'Only image/* content types are allowed'),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, 'Receipt image must be 10MB or smaller'),
})

export const ParseReceiptSchema = z.object({
  objectKey: z.string().trim().min(1).max(512),
})

/* ── Optional auth: profile + account linking ──────────────────────────── */

export const PaymentHandleSchema = z.object({
  provider: z.enum(['venmo', 'cashapp', 'paypal']),
  username: z.string().trim().min(1).max(64),
})

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(40).nullable().optional(),
  // Pass null to clear a saved handle.
  paymentHandle: PaymentHandleSchema.nullable().optional(),
})

/**
 * Body for POST /api/auth/link. `links` is optional: the route ALSO discovers
 * the browser's guest sessions from its `tabby_member_*` cookies, so a bare
 * `{}` still links everything this browser participated in.
 */
export const LinkAccountSchema = z.object({
  links: z
    .array(
      z.object({
        sessionId: z.string().trim().min(1).max(64),
        memberId: z.string().trim().min(1).max(64),
      }),
    )
    .max(50)
    .optional(),
})

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
