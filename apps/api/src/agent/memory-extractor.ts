import { createLLMFromEnv, extractText, parseJsonLoose } from "@project-intelligence/ai";

import { env } from "../config/env";
import { memoryExtractionSchema, type MemoryExtractionResult } from "./memory-schema";
import type { ConversationHistoryMessage } from "./state";

const MEMORY_EXTRACTION_PROMPT = `You extract useful persistent project memories from a conversation.

A project memory is information that is likely to remain useful across
future conversations about the same project.

Allowed memory types:

FACT:
A stable factual statement about the project.

PREFERENCE:
A project-specific preference or convention.

DECISION:
A decision the project team has explicitly made.

CONTEXT:
Useful background information about the project.

Rules:
- Only extract information explicitly stated or clearly established in the conversation.
- Do not invent or infer facts.
- Do not extract temporary details that are unlikely to matter later.
- Do not extract greetings, questions, generic explanations, or ordinary conversation.
- Do not extract information unrelated to the project.
- Prefer concise, self-contained memories.
- If there is nothing worth remembering, return an empty memories array.
- Return ONLY valid JSON.
- The JSON must have exactly this shape:

{
  "memories": [
    {
      "type": "FACT | PREFERENCE | DECISION | CONTEXT",
      "content": "..."
    }
  ]
}
`;

/**
 * Extract persistent project memories from a conversation.
 */
export async function extractMemories(
  conversationId: string,
  messages: ConversationHistoryMessage[],
): Promise<MemoryExtractionResult> {
  if (messages.length === 0) {
    return { memories: [] };
  }

  const conversation = messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n");

  const prompt = `${MEMORY_EXTRACTION_PROMPT}

CONVERSATION:

${conversation}`;

  const llm = createLLMFromEnv(
    env.LLM_PROVIDER,
    env.LLM_MODEL,
    env.OPENCODE_API_KEY,
    conversationId,
  );

  const response = await llm.invoke(prompt);

  const content = extractText(response.content);

  const parsed = parseJsonLoose(content);

  return memoryExtractionSchema.parse(parsed);
}
