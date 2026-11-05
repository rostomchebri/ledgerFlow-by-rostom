export type AuthErrorLike =
  | {
      status?: number;
      code?: string;
      message?: string;
    }
  | null
  | undefined;

export function isRateLimited(error: AuthErrorLike): boolean {
  return error?.status === 429;
}

export function isEmailNotVerified(error: AuthErrorLike): boolean {
  if (!error) return false;

  return (
    error.status === 403 &&
    (error.code === "EMAIL_NOT_VERIFIED" ||
      error.code === "EMAIL_NOT_VERIFIED_ERROR" ||
      /verif/i.test(error.message ?? ""))
  );
}

/**
 * Map a Better Auth error to a translation key under the `auth` namespace.
 * Authentication failures deliberately stay generic to avoid account
 * enumeration.
 */
export function authErrorKey(error: AuthErrorLike): string {
  if (!error) return "errors.generic";
  if (isRateLimited(error)) return "errors.rateLimited";
  if (isEmailNotVerified(error)) return "errors.emailNotVerified";
  if (error.code === "INVALID_OTP") return "errors.invalidCode";
  if (error.code === "OTP_EXPIRED") return "errors.codeExpired";
  if (error.code === "TOO_MANY_ATTEMPTS") return "errors.tooManyAttempts";
  if (error.code === "WEAK_PASSWORD") return "errors.weakPassword";
  if (
    error.code === "INVALID_ORIGIN" ||
    error.code === "MISSING_OR_NULL_ORIGIN" ||
    error.code === "INVALID_CALLBACK_URL"
  ) {
    return "errors.invalidOrigin";
  }
  if (error.status === 401) return "errors.invalidCredentials";
  if (error.status === 400 || error.status === 422) return "errors.invalidRequest";
  if (error.status === 403) return "errors.forbidden";

  return "errors.generic";
}

export function isInvalidToken(error: AuthErrorLike): boolean {
  if (!error) return false;
  if (error.code === "INVALID_TOKEN") return true;

  return error.status === 400 && /token|expired/i.test(error.message ?? "");
}
