import {
  createLLMFromEnv,
  createEvaluationClient,
  evaluationDataset,
  runEvaluationCase,
  recordEvaluationFeedback
} from "@project-intelligence/ai";
import { agentGraph } from "../agent/graph";
import { env } from "../config/env";

/**
 * Runs the Project Intelligence Agent evaluation dataset.
 */
export async function runEvaluation(): Promise<void> {
  const evaluatorLLM = createLLMFromEnv(
    env.LLM_PROVIDER,
    env.LLM_MODEL,
    env.OPENCODE_API_KEY,
    "evaluation",
  );

  const langSmithClient = createEvaluationClient();

  if (!langSmithClient) {
    console.warn("[evaluation] LangSmith is not configured");
  }

  for (const evaluationCase of evaluationDataset) {
    if (!evaluationCase.projectId) {
      console.warn(`[evaluation] Skipping "${evaluationCase.name}": no projectId configured`);
      continue;
    }

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

      console.log(`[evaluation] Feedback recorded for LangSmith run ${langSmithRunId}`);
    }

    if (langSmithClient) {
      console.log(`[evaluation] Score for "${result.name}": ${result.score.toFixed(2)}`);
    }

    console.log(`[evaluation] ${result.name}: ${result.score.toFixed(2)} — ${result.reasoning}`);
  }
}

runEvaluation().catch((error: unknown) => {
  console.error("[evaluation] Evaluation failed:", error);
  process.exit(1);
});
