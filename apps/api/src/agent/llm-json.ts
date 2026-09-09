import type { LLM } from "@project-intelligence/ai";
import { extractText, parseJsonLoose } from "@project-intelligence/ai";
import { logger } from "../lib/logger";

export { extractText, parseJsonLoose };

const MAX_ATTEMPTS = 2;

interface InvokeJsonOptions<T> {
  llm: LLM;
  prompt: string;
  /** Validates and maps the loosely-parsed JSON value into the final shape. */
  parse: (value: unknown) => T;
  /** Label used in log/error messages, e.g. "decomposition". */
  label: string;
}

/**
 * Invoke the LLM and parse a structured JSON response.
 *
 * On parse/validation failure the LLM is retried once with a stricter
 * instruction so a single malformed response does not fail the whole
 * agent run.
 */
export async function invokeJson<T>(options: InvokeJsonOptions<T>): Promise<T> {
  const { llm, prompt, parse, label } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const effectivePrompt =
      attempt === 1
        ? prompt
        : `${prompt}

IMPORTANT: Your previous response could not be parsed.
Respond with RAW valid JSON only.
Do not use markdown code fences.
Do not include explanations or any text before or after the JSON.`;

    const response = await llm.invoke(effectivePrompt);
    const text = extractText(response.content);

    logger.debug(`[agent] Raw ${label} response${attempt > 1 ? " (retry)" : ""}: ${text}`);

    try {
      return parse(parseJsonLoose(text));
    } catch (error) {
      lastError = error;
      logger.error(
        `[agent] ${label} response could not be parsed (attempt ${attempt}/${MAX_ATTEMPTS}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  throw new Error(
    `${label} failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
