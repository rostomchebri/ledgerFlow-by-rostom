import { apiErrorResponse, ApiError } from "@/lib/api-error";
import { InvitationNotFoundError, revokeInvitation } from "@/lib/firms/invitations";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE /api/firms/invitations/:id — revoke a pending invitation. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "member.invite");

    const { id } = await params;
    await revokeInvitation(firmId, id);

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof InvitationNotFoundError) {
      return apiErrorResponse(new ApiError("NOT_FOUND", error.message));
    }

    return apiErrorResponse(error);
  }
}
