import { createLLMFromEnv } from "@project-intelligence/ai";
import type { AgentState } from "../state.js";
import { env } from "../../config/env.js";

const SYSTEM_PROMPT = `You are the question decomposition component of Project Intelligence Agent.

Your job is to determine whether a user's project-related question should be answered as one question or broken into smaller questions.

Rules:
- Keep the original question if it can be answered with one retrieval task.
- Decompose broad questions into a small number of focused subquestions.
- Each subquestion should be independently useful for retrieving project evidence.
- Do not answer the questions.
- Do not invent project-specific details.
- Return ONLY a JSON array of strings.
- Prefer 2-5 subquestions for broad questions.
- Avoid redundant subquestions.
`;

function parseSubQuestions(content: string): string[] {
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("LLM decomposition response must be an array of strings.");
  }

  const questions = parsed.map((question) => question.trim()).filter(Boolean);

  if (questions.length === 0) {
    throw new Error("LLM decomposition returned no subquestions.");
  }

  return questions;
}

export async function decomposeNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);

  const response = await llm.invoke(
    `${SYSTEM_PROMPT}

USER QUESTION:

${state.query}`,
  );

  const content =
    typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const subQuestions = parseSubQuestions(content);

  console.log(`[agent] Decomposed question into ${subQuestions.length} subquestions`);

  return { subQuestions };
}
