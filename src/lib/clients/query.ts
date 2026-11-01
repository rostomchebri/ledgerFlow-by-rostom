import type { Prisma } from "@prisma/client";

import type { ClientListQuery } from "./schema";

/**
 * Builds the tenant-scoped `where` clause for the client list.
 * `firmId` is always applied first: no client can leak across firms (FIRM-05).
 */
export function buildClientWhere(
  firmId: string,
  query: Pick<ClientListQuery, "q" | "status" | "type">,
): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = { firmId };

  if (query.status === "active") {
    where.status = "ACTIVE";
  } else if (query.status === "archived") {
    where.status = "ARCHIVED";
  }

  if (query.type === "individual") {
    where.type = "INDIVIDUAL";
  } else if (query.type === "company") {
    where.type = "COMPANY";
  }

  const search = query.q.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { taxId: { contains: search, mode: "insensitive" } },
      { commercialRegister: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

/** Maps the URL-friendly sort key to a stable Prisma order (id breaks ties). */
export function buildClientOrderBy(
  sort: ClientListQuery["sort"],
): Prisma.ClientOrderByWithRelationInput[] {
  switch (sort) {
    case "name-desc":
      return [{ name: "desc" }, { id: "asc" }];
    case "created-desc":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "created-asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "updated-desc":
      return [{ updatedAt: "desc" }, { id: "asc" }];
    case "name-asc":
    default:
      return [{ name: "asc" }, { id: "asc" }];
  }
}
