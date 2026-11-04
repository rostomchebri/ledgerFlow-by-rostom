import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import {
  acceptInvitation,
  InvitationEmailMismatchError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationUnavailableError,
} from "@/lib/firms/invitations";
import { requireApiSession } from "@/lib/session";

type RouteContext = { params: Promise<{ token: string }> };

/** POST /api/invitations/:token/accept — FIRM-03 accept an invitation. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireApiSession();
    const { token } = await params;

    const membership = await acceptInvitation(token, {
      id: session.user.id,
      email: session.user.email,
    });

    return NextResponse.json({
      data: {
        firmId: membership.firmId,
        role: membership.role,
      },
    });
  } catch (error) {
    if (error instanceof InvitationNotFoundError) {
      return apiErrorResponse(new ApiError("NOT_FOUND", error.message));
    }

    if (error instanceof InvitationExpiredError) {
      return apiErrorResponse(new ApiError("BAD_REQUEST", error.message));
    }

    if (error instanceof InvitationUnavailableError) {
      return apiErrorResponse(new ApiError("CONFLICT", error.message));
    }

    if (error instanceof InvitationEmailMismatchError) {
      return apiErrorResponse(new ApiError("FORBIDDEN", error.message));
    }

    return apiErrorResponse(error);
  }
}
