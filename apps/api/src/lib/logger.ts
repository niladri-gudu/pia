/**
 * Minimal structured logger.
 *
 * Never log secrets: API keys, tokens, credentials, or full connection
 * strings must not be passed to this module.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_LABELS: Record<Level, string> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
};

function write(level: Level, message: string): void {
  const line = `[${new Date().toISOString()}] [${LEVEL_LABELS[level]}] ${message}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "debug" && process.env.NODE_ENV === "production") {
    return;
  }

  console.log(line);
}

export const logger = {
  debug: (message: string) => write("debug", message),
  info: (message: string) => write("info", message),
  warn: (message: string) => write("warn", message),
  error: (message: string) => write("error", message),
};
