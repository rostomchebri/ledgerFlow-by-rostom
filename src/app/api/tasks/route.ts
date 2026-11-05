import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import { parseTaskListQuery, taskInputSchema } from "@/lib/tasks/schema";
import { createTask, listTasks, TaskReferenceError } from "@/lib/tasks/service";

export async function GET(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "task.read");
    const query = parseTaskListQuery(
      Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>,
    );
    return NextResponse.json({ data: await listTasks(firmId, query) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "task.write");

    const body = await readJson(request);
    if (body === undefined) throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");

    const parsed = taskInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      const task = await createTask(firmId, parsed.data, userId);
      return NextResponse.json({ data: task }, { status: 201 });
    } catch (error) {
      if (error instanceof TaskReferenceError) throw new ApiError("BAD_REQUEST", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
