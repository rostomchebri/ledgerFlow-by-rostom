import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit/service";
import { clientInputSchema, fieldErrorsFromZod, parseClientListQuery } from "@/lib/clients/schema";
import { createClient, listClients } from "@/lib/clients/service";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

/** GET /api/clients — tenant-scoped, filtered, paginated client list. */
export async function GET(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "client.read");

    const { searchParams } = new URL(request.url);
    const query = parseClientListQuery(searchParams);
    const result = await listClients(firmId, query);

    return NextResponse.json({
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        pageCount: result.pageCount,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** POST /api/clients — creates a client inside the current firm. */
export async function POST(request: Request) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "client.write");

    const body = await readJson(request);

    if (body === undefined) {
      throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const parsed = clientInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    const client = await createClient(firmId, parsed.data, userId);
    await recordAudit({
      firmId,
      actorId: userId,
      action: "client.created",
      entityType: "client",
      entityId: client.id,
      metadata: { name: client.name, type: client.type },
    });
    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
