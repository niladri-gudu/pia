import { OpenCodeGoProvider } from "./opencode.js";
import type { LLMProvider, LLMProviderConfig } from "./types.js";

export * from "./types.js";
export { OpenCodeGoProvider } from "./opencode.js";

const PROVIDER_REGISTRY: Record<string, () => LLMProvider> = {
  opencode: () => new OpenCodeGoProvider(),
};

/**
 * Resolve an `LLMProvider` by name.
 *
 * @param provider - Provider identifier (defaults to "opencode").
 */
export function getProvider(provider: string): LLMProvider {
  const factory = PROVIDER_REGISTRY[provider];
  if (!factory) {
    throw new Error(
      `Unknown LLM provider "${provider}". ` +
        `Supported providers: ${Object.keys(PROVIDER_REGISTRY).join(", ")}.`,
    );
  }
  return factory();
}

/**
 * Build the configured LangChain chat model from environment configuration.
 * Throws a clear error until the OpenCode Go adapter is implemented.
 */
export function createLLMFromEnv(
  provider: string,
  model: string,
  apiKey: string,
): ReturnType<LLMProvider["createModel"]> {
  const config: LLMProviderConfig = {
    provider,
    model,
    options: {
      apiKey,
    },
  };
  return getProvider(provider).createModel(config);
}
