import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import {
  addChecklistItem,
  TaskNotFoundError,
  toggleChecklistItem,
} from "@/lib/tasks/service";

type RouteContext = { params: Promise<{ id: string }> };

const addSchema = z.object({ label: z.string().trim().min(1).max(200) }).strict();
const toggleSchema = z.object({ itemId: z.string().min(1).max(64), done: z.boolean() }).strict();

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "task.write");
    const { id } = await params;
    const parsed = addSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Invalid checklist item.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json({
        data: await addChecklistItem({ firmId, taskId: id, label: parsed.data.label }),
      });
    } catch (error) {
      if (error instanceof TaskNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "task.write");
    const { id } = await params;
    const parsed = toggleSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Invalid checklist update.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    try {
      return NextResponse.json({
        data: await toggleChecklistItem({
          firmId,
          taskId: id,
          itemId: parsed.data.itemId,
          done: parsed.data.done,
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
