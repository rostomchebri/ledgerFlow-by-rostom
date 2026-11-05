import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import { taskTemplateSchema } from "@/lib/tasks/schema";
import { createTaskTemplate, listTaskTemplates } from "@/lib/tasks/service";

export async function GET() {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "task.read");
    return NextResponse.json({ data: await listTaskTemplates(firmId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "task.write");
    const parsed = taskTemplateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }
    return NextResponse.json(
      { data: await createTaskTemplate(firmId, parsed.data) },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
