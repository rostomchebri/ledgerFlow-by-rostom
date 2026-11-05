import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import { taskCommentSchema } from "@/lib/tasks/schema";
import { addTaskComment, TaskNotFoundError } from "@/lib/tasks/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "task.write");
    const { id } = await params;
    const body = await readJson(request);
    const parsed = taskCommentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json({
        data: await addTaskComment({
          firmId,
          taskId: id,
          authorId: userId,
          body: parsed.data.body,
        }),
      });
    } catch (error) {
      if (error instanceof TaskNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
