type LogContext = Record<string, unknown>;

const REDACTED_KEYS = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "token",
  "secret",
  "authorization",
  "cookie",
]);

function redact(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      REDACTED_KEYS.has(key) ? "[redacted]" : value,
    ]),
  );
}

function write(level: "info" | "warn" | "error", event: string, context: LogContext = {}) {
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...redact(context),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

/**
 * Minimal structured logger. Auth flows must never log passwords, session
 * tokens, verification tokens, or raw cookies.
 */
export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
