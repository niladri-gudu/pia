/**
 * Utilities for parsing structured JSON out of raw LLM responses.
 *
 * LLMs frequently wrap their JSON output in markdown code fences or add
 * prose around it. These helpers tolerate the common failure modes instead
 * of relying on a bare `JSON.parse`.
 */

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
