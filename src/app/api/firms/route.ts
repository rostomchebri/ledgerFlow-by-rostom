import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { readJson } from "@/lib/api";
import { createFirmSchema } from "@/lib/firms/schema";
import { createFirmForUser, FirmAlreadyJoinedError } from "@/lib/firms/service";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/session";

/** GET /api/firms — workspaces the signed-in user belongs to. */
export async function GET() {
  try {
    const session = await requireApiSession();

    const memberships = await prisma.firmMember.findMany({
      where: { userId: session.user.id },
      include: { firm: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      data: memberships.map((membership) => ({
        ...membership.firm,
        role: membership.role,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** POST /api/firms — FIRM-01 onboarding: create a workspace and become OWNER. */
export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const body = await readJson(request);

    if (body === undefined) {
      throw new ApiError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const parsed = createFirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: {
          fields: Object.fromEntries(
            parsed.error.issues.map((issue) => [issue.path[0] ?? "name", issue.message]),
          ),
        },
      });
    }

    const { firm, membership } = await createFirmForUser(session.user.id, parsed.data.name);

    return NextResponse.json(
      {
        data: {
          id: firm.id,
          name: firm.name,
          slug: firm.slug,
          role: membership.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof FirmAlreadyJoinedError) {
      return apiErrorResponse(new ApiError("CONFLICT", error.message));
    }

    return apiErrorResponse(error);
  }
}
