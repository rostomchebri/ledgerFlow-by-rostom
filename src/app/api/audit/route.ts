import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { listAuditLogs, parseAuditListQuery } from "@/lib/audit/service";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

/** GET /api/audit — AUDIT-03 tenant-scoped audit log viewer feed. */
export async function GET(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "audit.read");

    const query = parseAuditListQuery(
      Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>,
    );

    return NextResponse.json({ data: await listAuditLogs(firmId, query) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
