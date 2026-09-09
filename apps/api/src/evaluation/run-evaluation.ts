import {
  createEvaluationDataset,
  createLLMFromEnv,
  createEvaluationClient,
  runEvaluationCase,
  recordEvaluationFeedback,
} from "@project-intelligence/ai";
import { agentGraph } from "../agent/graph";
import { env } from "../config/env";
import { logger } from "../lib/logger";

/**
 * Runs the Project Intelligence Agent evaluation dataset.
 *
 * The evaluated project is configured through `EVALUATION_PROJECT_ID` and
 * must already be synced, chunked and embedded.
 */
export async function runEvaluation(): Promise<void> {
  if (!env.EVALUATION_PROJECT_ID) {
    logger.warn(
      "[evaluation] EVALUATION_PROJECT_ID is not configured; every case will be skipped",
    );
  }

  const dataset = createEvaluationDataset(env.EVALUATION_PROJECT_ID);

  const evaluatorLLM = createLLMFromEnv(
    env.LLM_PROVIDER,
    env.LLM_MODEL,
    env.OPENCODE_API_KEY,
    "evaluation",
  );

  const langSmithClient = createEvaluationClient();

  if (!langSmithClient) {
    logger.warn("[evaluation] LangSmith is not configured");
  }

  let passed = 0;
  let total = 0;

  for (const evaluationCase of dataset) {
    if (!evaluationCase.projectId) {
      logger.warn(`[evaluation] Skipping "${evaluationCase.name}": no projectId configured`);
      continue;
    }

    total++;

    let langSmithRunId: string | undefined;

    const result = await runEvaluationCase(
      evaluationCase,
      async (question: string) => {
        const agentResult = await agentGraph.invoke(
          {
            projectId: evaluationCase.projectId,
            conversationId: "evaluation",
            query: question,
          },
          {
            callbacks: [
              {
                handleChainStart: async (_chain, _inputs, runId, parentRunId) => {
                  if (!parentRunId && !langSmithRunId) {
                    langSmithRunId = runId;
                  }
                },
              },
            ],
          },
        );

        return agentResult.answer;
      },
      evaluatorLLM,
    );

    if (langSmithClient && langSmithRunId) {
      await recordEvaluationFeedback(langSmithClient, langSmithRunId, result);

      logger.info(`[evaluation] Feedback recorded for LangSmith run ${langSmithRunId}`);
    }

    if (result.score >= 0.75) {
      passed++;
    }

    logger.info(`[evaluation] ${result.name}: ${result.score.toFixed(2)} — ${result.reasoning}`);
  }

  logger.info(`[evaluation] Summary: ${passed}/${total} cases scored >= 0.75`);
}

if (require.main === module) {
  runEvaluation().catch((error: unknown) => {
    logger.error(
      `[evaluation] Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
