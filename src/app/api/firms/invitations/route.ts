import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import {
  createInvitation,
  InvitationAlreadyPendingError,
  listPendingInvitations,
  MemberAlreadyExistsError,
  RoleNotAssignableError,
} from "@/lib/firms/invitations";
import { inviteMemberSchema } from "@/lib/firms/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

/** GET /api/firms/invitations — pending invitations for the current firm. */
export async function GET() {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "member.invite");

    const invitations = await listPendingInvitations(firmId);

    return NextResponse.json({
      data: invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** POST /api/firms/invitations — FIRM-03 invite a teammate. */
export async function POST(request: Request) {
  try {
    const { firmId, firmName, role, userId, userName } = await requireApiFirmContext();
    assertPermission(role, "member.invite");

    const body = await readJson(request);
    if (body === undefined) {
      throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: {
          fields: Object.fromEntries(
            parsed.error.issues.map((issue) => [issue.path[0] ?? "email", issue.message]),
          ),
        },
      });
    }

    const invitation = await createInvitation({
      firmId,
      firmName,
      email: parsed.data.email,
      role: parsed.data.role,
      actorRole: role,
      invitedById: userId,
      inviterName: userName,
    });

    return NextResponse.json(
      {
        data: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MemberAlreadyExistsError) {
      return apiErrorResponse(new ApiError("CONFLICT", error.message));
    }

    if (error instanceof InvitationAlreadyPendingError) {
      return apiErrorResponse(new ApiError("CONFLICT", error.message));
    }

    if (error instanceof RoleNotAssignableError) {
      return apiErrorResponse(new ApiError("FORBIDDEN", error.message));
    }

    return apiErrorResponse(error);
  }
}
