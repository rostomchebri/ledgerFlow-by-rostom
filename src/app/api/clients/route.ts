import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { getFirmContext } from "@/lib/firm-context";
import { clientInputSchema, fieldErrorsFromZod, parseClientListQuery } from "@/lib/clients/schema";
import { createClient, listClients } from "@/lib/clients/service";

/** GET /api/clients — tenant-scoped, filtered, paginated client list. */
export async function GET(request: Request) {
  const { firmId } = getFirmContext();
  const { searchParams } = new URL(request.url);

  try {
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
    console.error("[api/clients] list failed", error);
    return apiError(500, "internal_error", "Unable to load clients.");
  }
}

/** POST /api/clients — creates a client inside the current firm. */
export async function POST(request: Request) {
  const { firmId, userId } = getFirmContext();
  const body = await readJson(request);

  if (body === undefined) {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = clientInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      400,
      "validation_error",
      "Please correct the highlighted fields.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  try {
    const client = await createClient(firmId, parsed.data, userId);
    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    console.error("[api/clients] create failed", error);
    return apiError(500, "internal_error", "Unable to create the client.");
  }
}
