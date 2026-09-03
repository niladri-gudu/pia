import { createLLMFromEnv } from "@project-intelligence/ai";
import type { AgentState } from "../state";
import { env } from "../../config/env";

const SYSTEM_PROMPT = `You are the evidence evaluation component of Project Intelligence Agent.

Your job is to determine whether the retrieved project evidence is sufficient to answer the user's question.

Evaluate the evidence against each subquestion.

Rules:
- Evidence must be relevant to the subquestion.
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
`;

interface EvaluationResult {
  evidenceSufficient: boolean;
  missingEvidence: string[];
}

function parseEvaluation(content: string): EvaluationResult {
  const parsed: unknown = JSON.parse(content);

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
  const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);

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

  const evidence = evidenceSections.join("\n\n---\n\n");

  const prompt = `${SYSTEM_PROMPT}

ORIGINAL USER QUESTION:

${state.query}

SUBQUESTIONS AND EVIDENCE:

${evidence}`;

  const response = await llm.invoke(prompt);

  const content =
    typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  const evaluation = parseEvaluation(content);

  console.log(`[agent] Evidence sufficient: ${evaluation.evidenceSufficient}`);

  if (!evaluation.evidenceSufficient) {
    console.log(`[agent] Missing evidence: ${evaluation.missingEvidence.join("; ")}`);
  }

  return evaluation;
}
