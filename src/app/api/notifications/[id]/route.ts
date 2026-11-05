import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { requireApiFirmContext } from "@/lib/firm-context";
import { markNotificationRead } from "@/lib/notifications/service";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/:id — mark one notification as read.
 * The update is tenant- and user-scoped, so another user's id is a no-op.
 */
export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, userId } = await requireApiFirmContext();
    const { id } = await params;
    await markNotificationRead(firmId, userId, id);
    return NextResponse.json({ data: { id, read: true } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
