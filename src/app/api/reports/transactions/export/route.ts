import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { requireApiFirmContext } from "@/lib/firm-context";
import { parseDashboardRange, resolvePeriod } from "@/lib/finance/ranges";
import { assertPermission } from "@/lib/rbac";

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** GET /api/reports/transactions/export?range=year — tenant-scoped CSV. */
export async function GET(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "client.read");

    const { searchParams } = new URL(request.url);
    const range = parseDashboardRange(searchParams.get("range") ?? undefined);
    const period = resolvePeriod(range);

    const transactions = await db.transaction.findMany({
      where: { firmId, occurredAt: { gte: period.start, lt: period.end } },
      include: { client: { select: { name: true } } },
      orderBy: { occurredAt: "desc" },
    });

    const header = [
      "Date",
      "Reference",
      "Description",
      "Client",
      "Type",
      "Category",
      "Status",
      "Amount",
      "Currency",
    ];

    const rows = transactions.map((transaction) => [
      isoDate(transaction.occurredAt),
      transaction.reference,
      transaction.description,
      transaction.client?.name,
      transaction.type,
      transaction.category,
      transaction.status,
      transaction.amount.toFixed(2),
      transaction.currency,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\r\n");

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="ledgerflow-transactions-${range}-${isoDate(new Date())}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
