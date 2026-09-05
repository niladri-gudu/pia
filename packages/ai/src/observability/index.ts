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

/**
 * Explicitly wire LangSmith tracing into LangChain runs.
 *
 * LangChain's auto-instrumentation only looks at the legacy LANGCHAIN_* env
 * vars in some versions, so this aliases the canonical LANGSMITH_* vars onto
 * them before any LLM call is made. Call once at process startup (after env
 * validation). Idempotent; no-op when tracing is disabled.
 */
export function configureTracingFromEnv(): boolean {
  const config = getLangSmithConfig();

  if (!config.tracingEnabled) {
    return false;
  }

  if (process.env.LANGCHAIN_TRACING_V2 === undefined) {
    process.env.LANGCHAIN_TRACING_V2 = "true";
  }

  if (config.apiKey && process.env.LANGCHAIN_API_KEY === undefined) {
    process.env.LANGCHAIN_API_KEY = config.apiKey;
  }

  if (config.project && process.env.LANGCHAIN_PROJECT === undefined) {
    process.env.LANGCHAIN_PROJECT = config.project;
  }

  if (config.endpoint && process.env.LANGCHAIN_ENDPOINT === undefined) {
    process.env.LANGCHAIN_ENDPOINT = config.endpoint;
  }

  return true;
}
