import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import { taskUpdateSchema } from "@/lib/tasks/schema";
import {
  deleteTask,
  getTask,
  TaskNotFoundError,
  TaskReferenceError,
  updateTask,
} from "@/lib/tasks/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "task.read");
    const { id } = await params;
    const task = await getTask(firmId, id);
    if (!task) throw new ApiError("NOT_FOUND", "Task not found.");
    return NextResponse.json({ data: task });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "task.write");
    const { id } = await params;
    const body = await readJson(request);
    if (body === undefined) throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");

    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json({ data: await updateTask(firmId, id, parsed.data, userId) });
    } catch (error) {
      if (error instanceof TaskNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      if (error instanceof TaskReferenceError) throw new ApiError("BAD_REQUEST", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "task.write");
    const { id } = await params;
    try {
      await deleteTask(firmId, id, userId);
      return NextResponse.json({ data: { id } });
    } catch (error) {
      if (error instanceof TaskNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
