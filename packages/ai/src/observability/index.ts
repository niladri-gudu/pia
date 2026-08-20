import { Client } from "langsmith";

/**
 * LangSmith / LangChain tracing configuration.
 *
 * Tracing is optional and OFF by default so the app runs without a LangSmith
 * account. When enabled, LangChain auto-instruments the SDK via environment
 * variables (LANGSMITH_TRACING=true + LANGSMITH_API_KEY).
 */
export interface LangSmithConfig {
  tracingEnabled: boolean;
  apiKey?: string;
  project?: string;
  endpoint?: string;
}

export function getLangSmithConfig(): LangSmithConfig {
  return {
    tracingEnabled: process.env.LANGSMITH_TRACING === "true",
    apiKey: process.env.LANGSMITH_API_KEY || undefined,
    project: process.env.LANGSMITH_PROJECT || undefined,
    endpoint: process.env.LANGSMITH_ENDPOINT || undefined,
  };
}

export function isLangSmithEnabled(): boolean {
  return getLangSmithConfig().tracingEnabled;
}

/**
 * Create a LangSmith client if tracing is enabled, otherwise `null`.
 * LangChain tracing itself is enabled through environment variables at import
 * time; this client is provided for direct SDK use (e.g. evaluations).
 */
export function createLangSmithClient(): Client | null {
  const config = getLangSmithConfig();
  if (!config.tracingEnabled || !config.apiKey) {
    return null;
  }
  // Note: the target project is configured via the LANGSMITH_PROJECT env var
  // (LangChain auto-instrumentation), not via the Client constructor.
  return new Client({
    apiKey: config.apiKey,
    apiUrl: config.endpoint,
  });
}
