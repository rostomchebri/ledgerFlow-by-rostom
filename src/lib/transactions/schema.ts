import { z } from "zod";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export const TRANSACTION_STATUSES = ["CLEARED", "PENDING"] as const;
export const TRANSACTION_CATEGORIES = [
  "SALES",
  "SERVICES",
  "OPERATIONS",
  "MARKETING",
  "SOFTWARE",
  "PAYROLL",
  "OTHER",
] as const;

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

function toDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? value : date;
}

const fields = {
  type: z.enum(TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES).default("CLEARED"),
  category: z.enum(TRANSACTION_CATEGORIES),
  clientId: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
  reference: optionalText(80),
  description: z.string().trim().min(1, "Description is required.").max(300),
  amount: z.coerce.number().positive("Amount must be greater than zero.").max(1_000_000_000),
  currency: z.string().trim().length(3).default("DZD"),
  occurredAt: z.preprocess(toDate, z.date({ message: "Date is required." })),
};

export const transactionInputSchema = z.object(fields).strict();
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const transactionUpdateSchema = z
  .object({
    ...fields,
    type: fields.type.optional(),
    category: fields.category.optional(),
    description: fields.description.optional(),
    amount: fields.amount.optional(),
    occurredAt: fields.occurredAt.optional(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field." });

export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
