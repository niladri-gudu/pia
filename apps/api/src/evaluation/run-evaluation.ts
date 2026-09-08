import { createLLMFromEnv, evaluationDataset, runEvaluationCase } from "@project-intelligence/ai";
import { agentGraph } from "../agent/graph";
import { env } from "../config/env";

/**
 * Runs the Project Intelligence Agent evaluation dataset.
 */
export async function runEvaluation(): Promise<void> {
  const evaluatorLLM = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY, "evaluation");

  for (const evaluationCase of evaluationDataset) {
    if (!evaluationCase.projectId) {
      console.warn(`[evaluation] Skipping "${evaluationCase.name}": no projectId configured`);
      continue;
    }

    const result = await runEvaluationCase(
      evaluationCase,
      async (question: string) => {
        const agentResult = await agentGraph.invoke({
          projectId: evaluationCase.projectId,
          conversationId: "evaluation",
          query: question,
        });

        return agentResult.answer;
      },
      evaluatorLLM,
    );

    console.log(`[evaluation] ${result.name}: ${result.score.toFixed(2)} — ${result.reasoning}`);
  }
}

runEvaluation().catch((error: unknown) => {
  console.error("[evaluation] Evaluation failed:", error);
  process.exit(1);
});
