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

/** GET /api/reports/invoices/export — tenant-scoped invoice register CSV. */
export async function GET() {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "invoice.read");

    const invoices = await db.invoice.findMany({
      where: { firmId },
      include: { client: { select: { name: true } } },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    });

    const header = ["Number", "Client", "Status", "Issue date", "Due date", "Total", "Currency"];

    const rows = invoices.map((invoice) => [
      invoice.number,
      invoice.client.name,
      invoice.status,
      isoDate(invoice.issueDate),
      isoDate(invoice.dueDate),
      invoice.total.toFixed(2),
      invoice.currency,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\r\n");

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="ledgerflow-invoices-${isoDate(new Date())}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
