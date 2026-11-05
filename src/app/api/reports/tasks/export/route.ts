import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function isoDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** GET /api/reports/tasks/export — REPORT-03 tenant-scoped task register CSV. */
export async function GET() {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "task.read");

    const tasks = await db.task.findMany({
      where: { firmId },
      include: {
        client: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    const header = [
      "Title",
      "Client",
      "Assignee",
      "Status",
      "Priority",
      "Recurrence",
      "Due date",
      "Completed at",
    ];

    const rows = tasks.map((task) => [
      task.title,
      task.client?.name,
      task.assignee?.name,
      task.status,
      task.priority,
      task.recurrence,
      isoDate(task.dueDate),
      isoDate(task.completedAt),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\r\n");

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="ledgerflow-tasks-${isoDate(new Date())}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
