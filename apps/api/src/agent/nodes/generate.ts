import { createLLMFromEnv } from "@project-intelligence/ai";
import type { AgentState } from "../state";
import { env } from "../../config/env";

const SYSTEM_PROMPT = `You are Project Intelligence Agent, an AI assistant that answers questions about software projects.

Answer the user's question using only the provided project context.

Rules:
- Do not invent facts that are not supported by the context.
- If the context does not contain enough information to answer, say so clearly.
- Prefer precise technical explanations.
- When referencing information from the context, cite the source number like [Source 1].
- Do not mention similarity scores.
`;

export async function generateNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);

  const prompt = `${SYSTEM_PROMPT}

  PROJECT CONTEXT:

  ${state.context}

  USER QUESTION:

  ${state.query}

  Provide a concise but useful answer grounded in the project context.`;

  const response = await llm.invoke(prompt);

  const answer =
    typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  return { answer };
}
