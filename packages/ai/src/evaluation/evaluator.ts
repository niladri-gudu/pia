import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { extractText, parseJsonLoose } from "../llm/json";
import type { EvaluationResult } from "./types";

/**
 * Evaluates an agent answer against the expected behaviour
 * described by an evaluation case.
 */
export async function evaluateAnswer(
  result: EvaluationResult,
  llm: BaseChatModel,
): Promise<EvaluationResult> {
  const prompt = `
You are evaluating an AI project intelligence agent.

Evaluate the following answer.

QUESTION:
${result.question}

EXPECTED BEHAVIOUR:
${result.expectedAnswer}

AGENT ANSWER:
${result.answer}

Score the answer from 0 to 1.

Scoring:
- 1.0 = completely satisfies the expected behaviour
- 0.75 = mostly correct with minor issues
- 0.5 = partially correct
- 0.25 = mostly incorrect
- 0.0 = completely incorrect or fabricated

Return ONLY valid JSON in exactly this format:

{
  "score": 0.0,
  "reasoning": "brief explanation"
}
`;

  const response = await llm.invoke(prompt);

  const content = extractText(response.content);

  const parsed = parseJsonLoose(content) as {
    score: number;
    reasoning: string;
  };

  if (typeof parsed.score !== "number" || typeof parsed.reasoning !== "string") {
    throw new Error("Evaluator response is missing a numeric score or reasoning");
  }

  return {
    ...result,
    score: parsed.score,
    reasoning: parsed.reasoning,
  };
}
