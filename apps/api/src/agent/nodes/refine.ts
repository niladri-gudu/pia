import { createLLMFromEnv } from "@project-intelligence/ai";
import type { AgentState } from "../state";
import { env } from "../../config/env";

const SYSTEM_PROMPT = `You are the retrieval refinement component of Project Intelligence Agent.

Your job is to create targeted retrieval questions that can find evidence missing from the current project context.

Rules:
- Use the original user question as the overall goal.
- Use the existing subquestions and missing evidence to guide refinement.
- Each refined question should target a specific missing piece of evidence.
- Prefer concrete project artifacts such as commits, pull requests, issues, documents, dates, risks, blockers, or changes when appropriate.
- Do not answer the questions.
- Do not invent project-specific facts.
- Avoid repeating existing subquestions unless the missing evidence requires a more specific version.
- Return ONLY a JSON array of strings.
- Return between 1 and 5 refined questions.
`;

function parseRefinedQuestions(content: string): string[] {
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("LLM refinement response must be an array of strings.");
  }

  const questions = parsed.map((question) => question.trim()).filter(Boolean);

  if (questions.length === 0) {
    throw new Error("LLM refinement returned no questions.");
  }

  return questions.slice(0, 5);
}

export async function refineNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);

  const prompt = `${SYSTEM_PROMPT}

ORIGINAL USER QUESTION:

${state.query}

EXISTING SUBQUESTIONS:

${state.subQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}

MISSING EVIDENCE:

${state.missingEvidence.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Create targeted retrieval questions for the missing evidence.`;

  const response = await llm.invoke(prompt);

  const content =
    typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const refinedQuestions = parseRefinedQuestions(content);

  console.log(`[agent] Generated ${refinedQuestions.length} refined retrieval questions`);

  return {
    subQuestions: refinedQuestions,
    retrievalIteration: state.retrievalIteration + 1,
  };
}
