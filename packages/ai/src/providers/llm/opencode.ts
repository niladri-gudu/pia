import type { LLM, LLMProvider, LLMProviderConfig } from "./types.js";

/**
 * Error thrown when a requested LLM provider has not been implemented yet.
 */
export class ProviderNotImplementedError extends Error {
  constructor(provider: string) {
    super(
      `LLM provider "${provider}" is not implemented yet. ` +
        `Add a concrete adapter in packages/ai/src/providers/llm before using it.`,
    );
    this.name = "ProviderNotImplementedError";
  }
}

/**
 * OpenCode Go LLM provider adapter (PLACEHOLDER).
 *
 * IMPORTANT: This is a deliberately marked TODO. The exact API format,
 * endpoint, SDK and authentication expected by OpenCode Go have NOT been
 * verified against this project/environment, so we do NOT ship a fake
 * implementation here. Implement this adapter once the OpenCode Go integration
 * contract is confirmed (see README "OpenCode Go" notes and .env.example).
 *
 * The provider will surface a LangChain `BaseChatModel` so the rest of the
 * stack (LangChain + LangGraph) can consume it without changes.
 */
export class OpenCodeGoProvider implements LLMProvider {
  readonly name = "opencode";

  createModel(_config: LLMProviderConfig): LLM {
    throw new ProviderNotImplementedError("opencode");
  }
}
