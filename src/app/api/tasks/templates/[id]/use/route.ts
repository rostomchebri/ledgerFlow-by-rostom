import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import { taskFromTemplateSchema } from "@/lib/tasks/schema";
import { createTaskFromTemplate, TaskNotFoundError, TaskReferenceError } from "@/lib/tasks/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "task.write");
    const { id } = await params;
    const body = (await readJson(request)) ?? {};
    const parsed = taskFromTemplateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Invalid template overrides.");
    }

    try {
      return NextResponse.json(
        { data: await createTaskFromTemplate(firmId, id, userId, parsed.data) },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof TaskNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      if (error instanceof TaskReferenceError) throw new ApiError("BAD_REQUEST", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
