import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { evaluateAnswer } from "./evaluator";
import type { EvaluationCase, EvaluationResult } from "./types";

/**
 * Runs an evaluation case against the agent and evaluates its answer.
 */
export async function runEvaluationCase(
  evaluationCase: EvaluationCase,
  runAgent: (question: string) => Promise<string>,
  evaluatorLLM: BaseChatModel,
): Promise<EvaluationResult> {
  const answer = await runAgent(evaluationCase.question);

  const initialResult: EvaluationResult = {
    name: evaluationCase.name,
    question: evaluationCase.question,
    answer,
    expectedAnswer: evaluationCase.expectedAnswer,
    score: 0,
  };

  return evaluateAnswer(initialResult, evaluatorLLM);
}
