import { logger } from "./logger";
import { PermissionDeniedError } from "./rbac";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/**
 * Error shape shared by LedgerFlow API routes (SETUP-06 convention).
 * Better Auth routes keep Better Auth's native error envelope.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly retryAfter?: number;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { details?: unknown; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = options.details;
    this.retryAfter = options.retryAfter;
  }
}

export function apiErrorResponse(error: unknown): Response {
  // FIRM-02 — map a policy denial to the shared 403 envelope.
  if (error instanceof PermissionDeniedError) {
    error = new ApiError("FORBIDDEN", "You do not have permission to perform this action.");
  }

  if (error instanceof ApiError) {
    const headers = new Headers({ "content-type": "application/json" });

    if (error.retryAfter !== undefined) {
      headers.set("retry-after", String(error.retryAfter));
    }

    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      }),
      { status: error.status, headers },
    );
  }

  logger.error("api.unhandled_error", {
    error: error instanceof Error ? error.message : String(error),
  });

  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    }),
    { status: 500, headers: { "content-type": "application/json" } },
  );
}
