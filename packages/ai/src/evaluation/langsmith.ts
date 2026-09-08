import { Client } from "langsmith";
import { getLangSmithConfig } from "../observability";
import type { EvaluationResult } from "./types";

/**
 * Creates a LangSmith client when tracing/evaluation is configured.
 */
export function createEvaluationClient(): Client | null {
  const config = getLangSmithConfig();

  if (!config.tracingEnabled || !config.apiKey) {
    return null;
  }

  return new Client({
    apiKey: config.apiKey,
    apiUrl: config.endpoint,
  });
}

/**
 * Records an evaluation score against an existing LangSmith run.
 */
export async function recordEvaluationFeedback(
  client: Client,
  runId: string,
  result: EvaluationResult,
): Promise<void> {
  await client.createFeedback({
    runId,
    key: "correctness",
    score: result.score,
    comment: result.reasoning,
    sessionId: crypto.randomUUID(),
  });
}
