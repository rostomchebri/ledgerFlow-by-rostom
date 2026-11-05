import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { requireApiFirmContext } from "@/lib/firm-context";
import {
  listNotifications,
  markAllNotificationsRead,
  unreadNotificationCount,
} from "@/lib/notifications/service";

/** GET /api/notifications — NOTIF-01 in-app notification center. */
export async function GET(request: Request) {
  try {
    const { firmId, userId } = await requireApiFirmContext();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "1";
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

    const [items, unread] = await Promise.all([
      listNotifications(firmId, userId, {
        unreadOnly,
        limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50,
      }),
      unreadNotificationCount(firmId, userId),
    ]);

    return NextResponse.json({ data: { items, unread } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** PATCH /api/notifications — mark every notification as read. */
export async function PATCH() {
  try {
    const { firmId, userId } = await requireApiFirmContext();
    const updated = await markAllNotificationsRead(firmId, userId);
    return NextResponse.json({ data: { updated } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
