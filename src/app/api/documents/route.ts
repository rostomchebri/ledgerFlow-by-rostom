import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/api-error";
import { fieldErrorsFromZod } from "@/lib/clients/schema";
import {
  DocumentValidationError,
  listDocuments,
  uploadDocument,
} from "@/lib/documents/service";
import {
  documentMetadataSchema,
  parseDocumentListQuery,
} from "@/lib/documents/schema";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "document.read");
    const query = parseDocumentListQuery(
      Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>,
    );
    return NextResponse.json({ data: await listDocuments(firmId, query) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { firmId, role, userId } = await requireApiFirmContext();
    assertPermission(role, "document.write");

    const form = await request.formData().catch(() => null);
    if (!form) throw new ApiError("BAD_REQUEST", "Expected multipart/form-data.");

    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("BAD_REQUEST", "A file is required.");

    const parsed = documentMetadataSchema.safeParse({
      name: (form.get("name") as string | null) || file.name,
      description: form.get("description") ?? undefined,
      category: form.get("category") ?? undefined,
      clientId: form.get("clientId") ?? undefined,
      tags: form.get("tags") ?? undefined,
    });

    if (!parsed.success) {
      throw new ApiError("BAD_REQUEST", "Please correct the highlighted fields.", {
        details: { fields: fieldErrorsFromZod(parsed.error) },
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const document = await uploadDocument({
        firmId,
        actorId: userId,
        metadata: parsed.data,
        file: {
          buffer,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });
      return NextResponse.json({ data: document }, { status: 201 });
    } catch (error) {
      if (error instanceof DocumentValidationError) {
        throw new ApiError("BAD_REQUEST", error.message);
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
