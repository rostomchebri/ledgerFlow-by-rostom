import "server-only";

import { recordAudit } from "@/lib/audit/service";
import { db } from "@/lib/db";

import type { TransactionInput, TransactionUpdateInput } from "./schema";

export class TransactionNotFoundError extends Error {
  constructor() {
    super("Transaction not found.");
    this.name = "TransactionNotFoundError";
  }
}

export class TransactionReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionReferenceError";
  }
}

async function assertClient(firmId: string, clientId: string | undefined) {
  if (!clientId) return;
  const client = await db.client.findFirst({
    where: { id: clientId, firmId },
    select: { id: true },
  });
  if (!client) throw new TransactionReferenceError("The selected client does not belong to this firm.");
}

export async function createTransaction(
  firmId: string,
  input: TransactionInput,
  actorId: string,
) {
  await assertClient(firmId, input.clientId);

  const transaction = await db.transaction.create({
    data: { firmId, ...input, createdById: actorId },
  });

  await recordAudit({
    firmId,
    actorId,
    action: "transaction.created",
    entityType: "transaction",
    entityId: transaction.id,
    metadata: { description: transaction.description, amount: transaction.amount.toNumber() },
  });

  return transaction;
}

export async function getTransaction(firmId: string, transactionId: string) {
  return db.transaction.findFirst({ where: { id: transactionId, firmId } });
}

export async function updateTransaction(
  firmId: string,
  transactionId: string,
  input: TransactionUpdateInput,
  actorId: string,
) {
  const existing = await getTransaction(firmId, transactionId);
  if (!existing) throw new TransactionNotFoundError();
  if (input.clientId) await assertClient(firmId, input.clientId);

  const transaction = await db.transaction.update({
    where: { id: transactionId },
    data: input,
  });

  await recordAudit({
    firmId,
    actorId,
    action: "transaction.updated",
    entityType: "transaction",
    entityId: transaction.id,
    metadata: { description: transaction.description, amount: transaction.amount.toNumber() },
  });

  return transaction;
}

export async function deleteTransaction(
  firmId: string,
  transactionId: string,
  actorId: string,
) {
  const existing = await getTransaction(firmId, transactionId);
  if (!existing) throw new TransactionNotFoundError();

  await db.transaction.delete({ where: { id: transactionId } });

  await recordAudit({
    firmId,
    actorId,
    action: "transaction.deleted",
    entityType: "transaction",
    entityId: existing.id,
    metadata: { description: existing.description, amount: existing.amount.toNumber() },
  });
}
