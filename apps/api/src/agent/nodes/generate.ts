import { createLLMFromEnv } from "@project-intelligence/ai";
import type { AgentState } from "../state";
import { env } from "../../config/env";

const SYSTEM_PROMPT = `You are Project Intelligence Agent, an AI assistant that answers questions about software projects.

Answer the user's question using only the provided project context.

Rules:
- Do not invent facts that are not supported by the context.
- If the context does not contain enough information to answer, say so clearly.
- If evidence is insufficient, clearly distinguish supported findings from information that could not be verified.
- Do not present unverified information as fact.
- Treat the provided retrieval scope as authoritative for the searched time period and activity date field.
- Do not reinterpret temporal ranges from the observed document dates.
- When exhaustive activity retrieval is true, do not claim that the activity results are incomplete merely because the returned results do not visibly span the entire requested range.
- Prefer precise technical explanations.
- When referencing information from the context, cite the source number like [Source 1].
- Do not mention similarity scores.
`;

export async function generateNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);

  const evidenceStatus = state.evidenceSufficient ? "SUFFICIENT" : "INSUFFICIENT";

  const missingEvidence =
    state.missingEvidence.length > 0
      ? state.missingEvidence.map((item, index) => `${index + 1}. ${item}`).join("\n")
      : "None";

  const retrievalScope = state.subQuestions
    .map((plan, index) => {
      const scope = [
        `Sub-question ${index + 1}: ${plan.question}`,
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
        .join("\n");

      return scope;
    })
    .join("\n\n");

  const prompt = `${SYSTEM_PROMPT}

EVIDENCE STATUS:

${evidenceStatus}

MISSING OR UNVERIFIED EVIDENCE:

${missingEvidence}

Retrieval scope:
${retrievalScope}

Important:
- The retrieval scope describes exactly what the retrieval system searched.
- Treat the specified temporal range and activity date field as authoritative.
- Do not redefine, reinterpret, or infer the requested time period from the dates of the returned documents.
- If exhaustive activity retrieval is true, treat the returned activity evidence as complete for the specified project, date field, and temporal range.
- If exhaustive retrieval is false, treat the results as relevant evidence rather than a complete activity list.
- Distinguish between "no matching activity was found" and "the available evidence was insufficient to answer the question".

PROJECT CONTEXT:

${state.context}

USER QUESTION:

${state.query}

Provide a concise but useful answer grounded in the project context.

If the evidence status is INSUFFICIENT:
- Answer using only the claims supported by the retrieved context.
- Clearly state what could not be verified.
- Do not imply that the available evidence fully answers the user's question.
- If useful, organize the response into supported findings and evidence limitations.`;

  const response = await llm.invoke(prompt);

  const answer =
    typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  return { answer };
}
