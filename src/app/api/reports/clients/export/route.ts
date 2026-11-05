import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** GET /api/reports/clients/export — tenant-scoped client register CSV. */
export async function GET() {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "client.read");

    const clients = await db.client.findMany({
      where: { firmId },
      orderBy: [{ name: "asc" }],
    });

    const header = [
      "Name",
      "Type",
      "Status",
      "Contact person",
      "Email",
      "Phone",
      "Tax ID",
      "Commercial register",
      "Address",
      "City",
      "Postal code",
      "Country",
      "Created",
    ];

    const rows = clients.map((client) => [
      client.name,
      client.type,
      client.status,
      client.contactName,
      client.email,
      client.phone,
      client.taxId,
      client.commercialRegister,
      [client.addressLine1, client.addressLine2].filter(Boolean).join(" "),
      client.city,
      client.postalCode,
      client.country,
      isoDate(client.createdAt),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\r\n");

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="ledgerflow-clients-${isoDate(new Date())}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
