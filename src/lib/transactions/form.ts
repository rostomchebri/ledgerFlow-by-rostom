import type { Transaction } from "@prisma/client";

export type TransactionFormValues = {
  type: "INCOME" | "EXPENSE";
  status: "CLEARED" | "PENDING";
  category: string;
  clientId: string;
  reference: string;
  description: string;
  amount: string;
  currency: string;
  occurredAt: string;
};

export const EMPTY_TRANSACTION_FORM_VALUES: TransactionFormValues = {
  type: "INCOME",
  status: "CLEARED",
  category: "SALES",
  clientId: "",
  reference: "",
  description: "",
  amount: "",
  currency: "DZD",
  occurredAt: new Date().toISOString().slice(0, 10),
};

export function transactionToFormValues(
  transaction: Pick<
    Transaction,
    | "type"
    | "status"
    | "category"
    | "clientId"
    | "reference"
    | "description"
    | "amount"
    | "currency"
    | "occurredAt"
  >,
): TransactionFormValues {
  return {
    type: transaction.type,
    status: transaction.status,
    category: transaction.category,
    clientId: transaction.clientId ?? "",
    reference: transaction.reference ?? "",
    description: transaction.description,
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    occurredAt: transaction.occurredAt.toISOString().slice(0, 10),
  };
}

export function transactionFormToPayload(values: TransactionFormValues) {
  return {
    type: values.type,
    status: values.status,
    category: values.category,
    clientId: values.clientId || undefined,
    reference: values.reference || undefined,
    description: values.description,
    amount: values.amount,
    currency: values.currency.toUpperCase(),
    occurredAt: values.occurredAt,
  };
}
