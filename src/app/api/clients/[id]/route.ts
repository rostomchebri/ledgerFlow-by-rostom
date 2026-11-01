import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { getFirmContext } from "@/lib/firm-context";
import { clientUpdateSchema, fieldErrorsFromZod } from "@/lib/clients/schema";
import {
  ClientNotFoundError,
  getClient,
  setClientArchived,
  updateClient,
} from "@/lib/clients/service";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/clients/:id */
export async function GET(_request: Request, { params }: RouteContext) {
  const { firmId } = getFirmContext();
  const { id } = await params;

  try {
    const client = await getClient(firmId, id);
    if (!client) return apiError(404, "not_found", "Client not found.");
    return NextResponse.json({ data: client });
  } catch (error) {
    console.error("[api/clients/:id] read failed", error);
    return apiError(500, "internal_error", "Unable to load the client.");
  }
}

/** PATCH /api/clients/:id — partial update (tenant-scoped). */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { firmId } = getFirmContext();
  const { id } = await params;
  const body = await readJson(request);

  if (body === undefined) {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = clientUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "validation_error",
      "Please correct the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    const client = await updateClient(firmId, id, parsed.data);
    return NextResponse.json({ data: client });
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      return apiError(404, "not_found", error.message);
    }
    console.error("[api/clients/:id] update failed", error);
    return apiError(500, "internal_error", "Unable to update the client.");
  }
}

/** DELETE /api/clients/:id — soft delete (archive). Restore UI ships in CLIENT-05. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { firmId } = getFirmContext();
  const { id } = await params;

  try {
    const client = await setClientArchived(firmId, id, true);
    return NextResponse.json({ data: client });
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      return apiError(404, "not_found", error.message);
    }
    console.error("[api/clients/:id] archive failed", error);
    return apiError(500, "internal_error", "Unable to archive the client.");
  }
}
