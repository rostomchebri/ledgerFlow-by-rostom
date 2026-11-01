import type { Client } from "@prisma/client";

import { db } from "@/lib/db";

import { buildClientOrderBy, buildClientWhere } from "./query";
import type { ClientInput, ClientListQuery, ClientUpdateInput } from "./schema";

export class ClientNotFoundError extends Error {
  constructor() {
    super("Client not found.");
    this.name = "ClientNotFoundError";
  }
}

export class ClientConflictError extends Error {
  constructor(message = "A client with these details already exists.") {
    super(message);
    this.name = "ClientConflictError";
  }
}

export type ClientListResult = {
  items: Client[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** Lists clients for one firm. Search/filter/sort/pagination are applied server-side. */
export async function listClients(
  firmId: string,
  query: ClientListQuery,
): Promise<ClientListResult> {
  const where = buildClientWhere(firmId, query);

  const [items, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: buildClientOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.client.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Returns a client only when it belongs to `firmId`. */
export async function getClient(firmId: string, clientId: string): Promise<Client | null> {
  return db.client.findFirst({ where: { id: clientId, firmId } });
}

export async function getClientOrThrow(firmId: string, clientId: string): Promise<Client> {
  const client = await getClient(firmId, clientId);
  if (!client) throw new ClientNotFoundError();
  return client;
}

export async function createClient(
  firmId: string,
  input: ClientInput,
  actorId: string | null = null,
): Promise<Client> {
  return db.client.create({
    data: {
      ...input,
      firmId,
      createdById: actorId,
    },
  });
}

export async function updateClient(
  firmId: string,
  clientId: string,
  input: ClientUpdateInput,
): Promise<Client> {
  const existing = await getClient(firmId, clientId);
  if (!existing) throw new ClientNotFoundError();

  return db.client.update({
    where: { id: existing.id },
    data: input,
  });
}

/**
 * Soft delete / restore. The archive UI ships in CLIENT-05; the API primitive
 * lives here because CLIENT-01 owns client CRUD.
 */
export async function setClientArchived(
  firmId: string,
  clientId: string,
  archived: boolean,
): Promise<Client> {
  const existing = await getClient(firmId, clientId);
  if (!existing) throw new ClientNotFoundError();

  return db.client.update({
    where: { id: existing.id },
    data: {
      status: archived ? "ARCHIVED" : "ACTIVE",
      archivedAt: archived ? new Date() : null,
    },
  });
}
