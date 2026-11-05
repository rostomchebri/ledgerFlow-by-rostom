import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { changeMemberRole, MemberManagementError, MemberNotFoundError, removeMember } from "@/lib/firms/members";
import { assertPermission, FIRM_ROLES } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

const roleSchema = z.object({ role: z.enum(FIRM_ROLES) }).strict();

/** PATCH /api/firms/members/:id — FIRM-04 change a member's role. */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "member.manage");

    const parsed = roleSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Choose a valid role.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    const { id } = await params;

    try {
      const member = await changeMemberRole({
        firmId,
        memberId: id,
        actorId: userId,
        actorRole: role,
        role: parsed.data.role,
      });
      return NextResponse.json({ data: member });
    } catch (error) {
      if (error instanceof MemberNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      if (error instanceof MemberManagementError) throw new ApiError("CONFLICT", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** DELETE /api/firms/members/:id — FIRM-04 remove a member. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "member.manage");
    const { id } = await params;

    try {
      await removeMember({ firmId, memberId: id, actorId: userId, actorRole: role });
      return NextResponse.json({ data: { id } });
    } catch (error) {
      if (error instanceof MemberNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      if (error instanceof MemberManagementError) throw new ApiError("CONFLICT", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
