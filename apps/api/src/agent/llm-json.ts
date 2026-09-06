import type { LLM } from "@project-intelligence/ai";

const MAX_ATTEMPTS = 2;

/**
 * Extract plain text from a LangChain message `content` value.
 *
 * `content` is a string for most providers, but some return an array of
 * content blocks (e.g. `[{ type: "text", text: "..." }]`). Stringifying that
 * array would corrupt JSON parsing, so the `text` parts are joined instead.
 */
export function extractText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;

        if (part && typeof part === "object") {
          const text = (part as { text?: unknown }).text;
          if (typeof text === "string") return text;
        }

        return "";
      })
      .join("");
  }

  if (content && typeof content === "object") {
    const text = (content as { text?: unknown }).text;
    if (typeof text === "string") return text;
  }

  return "";
}

/**
 * Extract a balanced JSON value (object or array) starting at `start`.
 * Handles braces/brackets inside JSON string literals correctly.
 */
function extractBalanced(text: string, start: number): string {
  const open = text[start];
  const close = open === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return text.slice(start);
}

/**
 * Parse JSON from a raw LLM response, tolerating the common failure modes:
 * markdown code fences (```json ... ```), surrounding prose, and leading
 * labels. Returns the parsed value or throws a descriptive error.
 */
export function parseJsonLoose(raw: string): unknown {
  const text = raw.trim();

  if (!text) {
    throw new Error("LLM response is empty");
  }

  const candidates: string[] = [];

  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let fenceMatch: RegExpExecArray | null;

  while ((fenceMatch = fenceRegex.exec(text)) !== null) {
    const candidate = (fenceMatch[1] ?? "").trim();
    if (candidate) {
      candidates.push(candidate);
    }
  }

  candidates.push(text);

  const jsonStart = text.search(/[{[]/);
  if (jsonStart !== -1) {
    candidates.push(extractBalanced(text, jsonStart));
  }

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch (error) {
      lastError = error;
    }
  }

  const snippet = text.length > 300 ? `${text.slice(0, 300)}...` : text;

  throw new Error(
    `LLM response is not valid JSON. Received: "${snippet}"${
      lastError instanceof Error ? ` (${lastError.message})` : ""
    }`,
  );
}

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

    console.log(`\n[agent] Raw ${label} response${attempt > 1 ? " (retry)" : ""}:`);
    console.log(text);
    console.log();

    try {
      return parse(parseJsonLoose(text));
    } catch (error) {
      lastError = error;
      console.error(
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
