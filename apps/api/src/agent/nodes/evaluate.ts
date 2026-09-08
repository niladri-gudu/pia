import { createLLMFromEnv } from "@project-intelligence/ai";
import type { AgentState } from "../state";
import { env } from "../../config/env";
import { invokeJson } from "../llm-json";

const SYSTEM_PROMPT = `You are the evidence evaluation component of Project Intelligence Agent.

Your job is to determine whether the available project context is sufficient to answer the user's question.

The available context consists of:
1. Retrieved project evidence from the repository.
2. Retrieved project memories representing persistent facts, preferences, decisions, and context from previous project interactions.

Evaluate both sources of context against the user's question.

Rules:
- Evidence must be relevant to the subquestion.
- Project memories may directly answer questions about previously established project facts, preferences, decisions, or context.
- If a relevant project memory directly answers the user's question, repository evidence is not required merely to verify that memory.
- Memories are persistent project context, but they are not source evidence and must never be treated as citation sources.
- If a memory answers the question but repository evidence does not verify it, the answer may still be considered sufficient when the question asks what was previously decided, preferred, established, or remembered.
- If the user asks what the repository currently contains, implements, or proves, repository evidence is required.
- If the question asks both what was decided and whether that decision was implemented or verified in the repository, both memory and repository evidence may be required.
- Evidence must contain enough information to support a useful answer.
- Do not answer the user's question.
- Do not invent missing information.
- If important parts of the question are unsupported, mark the evidence as insufficient.
- When evidence is insufficient, identify the specific information that is missing.
- Missing evidence descriptions should be concise and actionable.
- Return ONLY a JSON object.
- The JSON object must contain exactly these fields:
  "evidenceSufficient": boolean
  "missingEvidence": string[]
- If evidenceSufficient is true, return an empty missingEvidence array.
- Retrieval scope describes what the retrieval system actually searched.
- When "Exhaustive retrieval: true" is provided for an activity query, treat the returned activity evidence as complete for the specified project, date field, and temporal range.
- Do not claim that activity is missing merely because the returned results begin later than the start of the requested period.
- Distinguish between "no matching activity was retrieved" and "retrieval failed to cover the requested scope."
- Return RAW valid JSON only.
- Do not use markdown code fences.
- Do not include explanations or any text before or after the JSON.
`;

interface EvaluationResult {
  evidenceSufficient: boolean;
  missingEvidence: string[];
}

function parseEvaluation(parsed: unknown): EvaluationResult {
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("evidenceSufficient" in parsed) ||
    !("missingEvidence" in parsed) ||
    typeof parsed.evidenceSufficient !== "boolean" ||
    !Array.isArray(parsed.missingEvidence) ||
    !parsed.missingEvidence.every((item) => typeof item === "string")
  ) {
    throw new Error(
      'LLM evaluation response must contain "evidenceSufficient" boolean and "missingEvidence" string array.',
    );
  }

  return {
    evidenceSufficient: parsed.evidenceSufficient,
    missingEvidence: parsed.missingEvidence.map((item) => item.trim()).filter(Boolean),
  };
}

export async function evaluateNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = createLLMFromEnv(
    env.LLM_PROVIDER,
    env.LLM_MODEL,
    env.OPENCODE_API_KEY,
    state.conversationId,
  );

  const evidenceSections = state.evidence.map((item, index) => {
    const plan = state.subQuestions[index];

    const retrievalScope = plan
      ? [
          `Retrieval strategy: ${plan.strategy}`,
          plan.activityConstraints?.dateField
            ? `Activity date field: ${plan.activityConstraints.dateField}`
            : null,
          plan.activityConstraints?.temporalRange
            ? `Temporal range: ${plan.activityConstraints.temporalRange}`
            : null,
          plan.activityConstraints?.exhaustive !== undefined
            ? `Exhaustive retrieval: ${plan.activityConstraints.exhaustive}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "Retrieval scope unavailable.";

    const evidenceText =
      item.chunks.length > 0
        ? item.chunks
            .map((chunk, chunkIndex) => {
              const metadata = [
                `Title: ${chunk.title}`,
                chunk.url ? `URL: ${chunk.url}` : null,
                chunk.activityAt ? `Activity date: ${chunk.activityAt.toISOString()}` : null,
                chunk.activityDateField ? `Activity date field: ${chunk.activityDateField}` : null,
              ]
                .filter(Boolean)
                .join("\n");

              return `Evidence ${chunkIndex + 1}:
    ${metadata}

    ${chunk.content}`;
            })
            .join("\n\n")
        : "No evidence retrieved.";

    return `Subquestion ${index + 1}:
    ${item.subQuestion}

    Retrieval scope:
    ${retrievalScope}

    Retrieved evidence:
    ${evidenceText}`;
  });

  const memoryText =
    state.memories && state.memories.length > 0
      ? state.memories
          .map(
            (memory, index) =>
              `Memory ${index + 1}:
Type: ${memory.type}
Content: ${memory.content}`,
          )
          .join("\n\n")
      : "No relevant project memories retrieved.";

  const evidence = evidenceSections.join("\n\n---\n\n");

  const prompt = `${SYSTEM_PROMPT}

ORIGINAL USER QUESTION:

${state.query}

RELEVANT PROJECT MEMORIES:

${memoryText}

SUBQUESTIONS AND EVIDENCE:

${evidence}`;

  const evaluation = await invokeJson({
    llm,
    prompt,
    parse: parseEvaluation,
    label: "evaluation",
  });

  console.log(`[agent] Evidence sufficient: ${evaluation.evidenceSufficient}`);

  if (!evaluation.evidenceSufficient) {
    console.log(`[agent] Missing evidence: ${evaluation.missingEvidence.join("; ")}`);
  }

  return evaluation;
}
