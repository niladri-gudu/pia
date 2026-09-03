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
- When the user asks about a specific time period, do not assume that retrieved documents belong to that period unless the evidence supports it.
- Prefer precise technical explanations.
- When referencing information from the context, cite the source number like [Source 1].
- Do not mention similarity scores.
`;

export async function generateNode(
  state: AgentState,
): Promise<Partial<AgentState>> {
  const llm = createLLMFromEnv(
    env.LLM_PROVIDER,
    env.LLM_MODEL,
    env.OPENCODE_API_KEY,
  );

  const evidenceStatus = state.evidenceSufficient
    ? "SUFFICIENT"
    : "INSUFFICIENT";

  const missingEvidence =
    state.missingEvidence.length > 0
      ? state.missingEvidence
          .map((item, index) => `${index + 1}. ${item}`)
          .join("\n")
      : "None";

  const prompt = `${SYSTEM_PROMPT}

EVIDENCE STATUS:

${evidenceStatus}

MISSING OR UNVERIFIED EVIDENCE:

${missingEvidence}

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
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return { answer };
}