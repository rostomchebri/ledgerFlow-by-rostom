import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { recordAudit } from "@/lib/audit/service";
import { ClientNotFoundError, setClientArchived } from "@/lib/clients/service";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/clients/:id/restore — CLIENT-05 restore an archived client. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "client.archive");

    const { id } = await params;
    const client = await setClientArchived(firmId, id, false);
    await recordAudit({
      firmId,
      actorId: userId,
      action: "client.restored",
      entityType: "client",
      entityId: client.id,
      metadata: { name: client.name },
    });
    return NextResponse.json({ data: client });
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      return apiErrorResponse(new ApiError("NOT_FOUND", error.message));
    }

    return apiErrorResponse(error);
  }
}
