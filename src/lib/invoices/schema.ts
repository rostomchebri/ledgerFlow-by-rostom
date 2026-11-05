import { z } from "zod";

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"] as const;

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function optionalText(max: number) {
  return z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
}

function toDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? value : date;
}

const invoiceLineSchema = z
  .object({
    description: z.string().trim().min(1, "Line description is required.").max(300),
    quantity: z.coerce.number().positive("Quantity must be greater than zero.").max(1_000_000),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative.").max(1_000_000_000),
  })
  .strict();

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

const invoiceFields = {
  clientId: z.string().trim().min(1, "Select a client.").max(64),
  number: z.string().trim().min(1, "Invoice number is required.").max(40),
  issueDate: z.preprocess(toDate, z.date({ message: "Issue date is required." })),
  dueDate: z.preprocess(toDate, z.date({ message: "Due date is required." })),
  currency: z.string().trim().length(3, "Use a three-letter currency code.").default("DZD"),
  notes: optionalText(2000),
  lines: z.array(invoiceLineSchema).min(1, "Add at least one line.").max(100),
};

export const invoiceInputSchema = z
  .object(invoiceFields)
  .strict()
  .refine((value) => value.dueDate >= value.issueDate, {
    message: "Due date cannot be before the issue date.",
    path: ["dueDate"],
  });

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const invoiceUpdateSchema = z
  .object({
    ...invoiceFields,
    clientId: invoiceFields.clientId.optional(),
    number: invoiceFields.number.optional(),
    issueDate: invoiceFields.issueDate.optional(),
    dueDate: invoiceFields.dueDate.optional(),
    lines: invoiceFields.lines.optional(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field." });

export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

export const invoiceStatusSchema = z.object({ status: z.enum(INVOICE_STATUSES) }).strict();

export const invoiceBulkSchema = z
  .object({
    ids: z.array(z.string().min(1).max(64)).min(1).max(100),
    action: z.enum(["send", "paid", "overdue"]),
  })
  .strict();

export function calculateTotals(lines: InvoiceLineInput[]) {
  const normalized = lines.map((line, index) => {
    const lineTotal = Math.round(line.quantity * line.unitPrice * 100) / 100;
    return { ...line, lineTotal, position: index };
  });
  const subtotal = Math.round(normalized.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
  return { lines: normalized, subtotal, total: subtotal };
}

export function parseInvoiceListFilters(
  params: Record<string, string | string[] | undefined>,
) {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const rawStatus = first(params.status)?.toUpperCase();
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  const from = first(params.from);
  const to = first(params.to);

  return {
    q: (first(params.q) ?? "").trim().slice(0, 120),
    status: INVOICE_STATUSES.includes(rawStatus as never)
      ? (rawStatus as (typeof INVOICE_STATUSES)[number])
      : ("ALL" as const),
    clientId: first(params.clientId)?.slice(0, 64) ?? "",
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}
