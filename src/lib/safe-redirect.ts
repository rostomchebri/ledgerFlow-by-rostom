const FALLBACK_PATH = "/dashboard";

/**
 * Accept only same-origin, absolute-path redirects. This blocks open-redirect
 * payloads such as `https://evil.example`, `//evil.example`, `/\evil.example`,
 * and control characters in the callback URL.
 */
export function safeRedirectPath(
  value: string | string[] | undefined,
  fallback: string = FALLBACK_PATH,
): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || candidate.length > 2048) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (candidate.includes("\\") || /[\u0000-\u001F\u007F]/.test(candidate)) return fallback;

  try {
    const parsed = new URL(candidate, "http://ledgerflow.local");

    if (parsed.origin !== "http://ledgerflow.local") return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
