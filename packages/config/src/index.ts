import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const SERVICE_NAME = "project-intelligence-api";
export const SERVICE_VERSION = "0.1.0";
export const MONOREPO_NAME = "project-intelligence-agent";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Loads a `.env` file into `process.env` without overriding already-set
 * environment variables. Looks for `.env` relative to `cwd` and then walks up
 * to the monorepo root so apps can resolve a single shared root `.env`.
 *
 * @param cwd - Directory to start searching from (defaults to `process.cwd()`).
 */
export function loadEnv(cwd: string = process.cwd()): void {
  const candidates = [
    resolve(cwd, ".env"),
    resolve(cwd, "../../.env"),
    resolve(cwd, "../../../.env"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate });
      return;
    }
  }
}
