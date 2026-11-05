import { apiErrorResponse, ApiError } from "@/lib/api-error";
import { DocumentNotFoundError, getDocumentContent } from "@/lib/documents/service";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import { sanitizeFilename } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DOC-05 — streams the object through the app. Storage credentials never reach
 * the browser, and the tenant check happens before a byte is read.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "document.read");
    const { id } = await params;

    const { document, body } = await getDocumentContent(firmId, id);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const filename = sanitizeFilename(document.name);

    return new Response(body, {
      headers: {
        "content-type": document.mimeType,
        "content-length": String(document.size),
        "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return apiErrorResponse(new ApiError("NOT_FOUND", error.message));
    }
    return apiErrorResponse(error);
  }
}
