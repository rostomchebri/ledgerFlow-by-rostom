import type { Invoice, InvoiceLine } from "@prisma/client";

import type { InvoiceInput } from "./schema";

export type InvoiceFormLine = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export type InvoiceFormValues = {
  clientId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  notes: string;
  lines: InvoiceFormLine[];
};

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function emptyInvoiceFormValues(number: string): InvoiceFormValues {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 30);

  return {
    clientId: "",
    number,
    issueDate: toDateInput(today),
    dueDate: toDateInput(due),
    currency: "DZD",
    notes: "",
    lines: [{ description: "", quantity: "1", unitPrice: "0" }],
  };
}

export function invoiceToFormValues(
  invoice: Pick<
    Invoice,
    "clientId" | "number" | "issueDate" | "dueDate" | "currency" | "notes"
  > & { lineItems: Pick<InvoiceLine, "description" | "quantity" | "unitPrice">[] },
): InvoiceFormValues {
  return {
    clientId: invoice.clientId,
    number: invoice.number,
    issueDate: toDateInput(invoice.issueDate),
    dueDate: toDateInput(invoice.dueDate),
    currency: invoice.currency,
    notes: invoice.notes ?? "",
    lines: invoice.lineItems.length
      ? invoice.lineItems.map((line) => ({
          description: line.description,
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
        }))
      : [{ description: "", quantity: "1", unitPrice: "0" }],
  };
}

export function invoiceFormToPayload(values: InvoiceFormValues): unknown {
  return {
    clientId: values.clientId,
    number: values.number,
    issueDate: values.issueDate,
    dueDate: values.dueDate,
    currency: values.currency.toUpperCase(),
    notes: values.notes || undefined,
    lines: values.lines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    })),
  };
}

export function invoiceTotal(lines: InvoiceFormLine[]): number {
  return lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
    return sum + Math.round(quantity * unitPrice * 100) / 100;
  }, 0);
}

export type InvoicePayload = InvoiceInput;
