import { apiErrorResponse, ApiError } from "@/lib/api-error";
import {
  contentDisposition,
  resolveDocumentFilename,
  resolveMimeType,
} from "@/lib/documents/file";
import {
  DocumentContentUnavailableError,
  DocumentNotFoundError,
  getDocumentContent,
} from "@/lib/documents/service";
import { requireApiFirmContext } from "@/lib/firm-context";
import { assertPermission } from "@/lib/rbac";
import { StorageNotConfiguredError } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DOC-05 — streams the object through the app. Storage credentials never reach
 * the browser, and the tenant check happens before a byte is read.
 *
 * Preview embeds (`<img>`, `<iframe>`) get `inline`; an explicit download
 * (`?download=1`) gets `attachment` with the original filename and extension.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { firmId, role } = await requireApiFirmContext();
    assertPermission(role, "document.read");
    const { id } = await params;

    const { document, body, contentLength } = await getDocumentContent(firmId, id);
    const attachment = new URL(request.url).searchParams.get("download") === "1";
    const filename = resolveDocumentFilename(document);
    const mimeType = resolveMimeType(document.mimeType, filename) ?? "application/octet-stream";
    const length = contentLength ?? document.size;

    return new Response(body, {
      headers: {
        "content-type": mimeType,
        ...(length > 0 ? { "content-length": String(length) } : {}),
        "content-disposition": contentDisposition(
          attachment ? "attachment" : "inline",
          filename,
        ),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return apiErrorResponse(new ApiError("NOT_FOUND", error.message));
    }
    if (error instanceof DocumentContentUnavailableError) {
      return apiErrorResponse(
        new ApiError(
          "NOT_FOUND",
          "The file is no longer available in storage. Contact an administrator.",
        ),
      );
    }
    if (error instanceof StorageNotConfiguredError) {
      return apiErrorResponse(
        new ApiError(
          "SERVICE_UNAVAILABLE",
          "Document storage is not configured. Contact an administrator.",
        ),
      );
    }
    return apiErrorResponse(error);
  }
}
