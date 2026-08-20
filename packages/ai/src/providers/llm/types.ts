import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * The application is intentionally decoupled from any single LLM provider.
 *
 * Every provider implements `LLMProvider` and returns a LangChain
 * `BaseChatModel` so that LangChain/LangGraph can orchestrate it uniformly.
 *
 * LangChain is used for model abstractions/integrations.
 * LangGraph is used for agent orchestration.
 * OpenCode Go is the model/API provider behind one adapter.
 */
export type LLM = BaseChatModel;

export interface LLMProviderConfig {
  /** Provider identifier, e.g. "opencode". */
  provider: string;
  /** Model name, e.g. "deepseek-v4-flash". */
  model: string;
  /** Optional overrides for a specific provider (keyed by provider). */
  options?: Record<string, unknown>;
}

export interface LLMProvider {
  readonly name: string;

  /** Build a configured LangChain chat model for this provider. */
  createModel(config: LLMProviderConfig): LLM;
}
