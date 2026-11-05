import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit/service";
import { clientUpdateSchema, fieldErrorsFromZod } from "@/lib/clients/schema";
import {
  ClientNotFoundError,
  getClient,
  setClientArchived,
  updateClient,
} from "@/lib/clients/service";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

function toApiError(error: unknown): unknown {
  if (error instanceof ClientNotFoundError) {
    return new ApiError("NOT_FOUND", error.message);
  }
  return error;
}

/** GET /api/clients/:id */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "client.read");

    const { id } = await params;
    const client = await getClient(firmId, id);

    if (!client) throw new ApiError("NOT_FOUND", "Client not found.");
    return NextResponse.json({ data: client });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** PATCH /api/clients/:id — partial update (tenant-scoped). */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "client.write");

    const { id } = await params;
    const body = await readJson(request);

    if (body === undefined) {
      throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const parsed = clientUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    const client = await updateClient(firmId, id, parsed.data);
    await recordAudit({
      firmId,
      actorId: userId,
      action: parsed.data.assignedToId !== undefined ? "client.assigned" : "client.updated",
      entityType: "client",
      entityId: client.id,
      metadata: { name: client.name, assignedToId: client.assignedToId },
    });
    return NextResponse.json({ data: client });
  } catch (error) {
    return apiErrorResponse(toApiError(error));
  }
}

/** DELETE /api/clients/:id — soft delete (archive). Restore is POST /restore. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "client.archive");

    const { id } = await params;
    const client = await setClientArchived(firmId, id, true);
    await recordAudit({
      firmId,
      actorId: userId,
      action: "client.archived",
      entityType: "client",
      entityId: client.id,
      metadata: { name: client.name },
    });
    return NextResponse.json({ data: client });
  } catch (error) {
    return apiErrorResponse(toApiError(error));
  }
}
