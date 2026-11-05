import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import {
  DocumentNotFoundError,
  getDocument,
  setDocumentDeleted,
} from "@/lib/documents/service";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "document.read");
    const { id } = await params;
    const document = await getDocument(firmId, id);
    if (!document) throw new ApiError("NOT_FOUND", "Document not found.");
    return NextResponse.json({ data: document });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "document.write");
    const { id } = await params;
    try {
      return NextResponse.json({
        data: await setDocumentDeleted({
          firmId,
          documentId: id,
          actorId: userId,
          deleted: true,
        }),
      });
    } catch (error) {
      if (error instanceof DocumentNotFoundError) throw new ApiError("NOT_FOUND", error.message);
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
