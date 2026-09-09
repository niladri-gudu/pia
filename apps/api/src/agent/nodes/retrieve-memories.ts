import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { searchSimilarMemories } from "../../modules/memory/memory.repository";
import { logger } from "../../lib/logger";
import type { AgentMemory, AgentState } from "../state";

const embeddingProvider = createEmbeddingProvider();

const MEMORY_TOP_K = 5;

/**
 * Retrieve project memories semantically relevant to the current query.
 */
export async function retrieveMemories(state: AgentState): Promise<Partial<AgentState>> {
  const queryEmbedding = await embeddingProvider.embedQuery(state.query);

  const memories = await searchSimilarMemories(state.projectId, queryEmbedding, MEMORY_TOP_K);

  const normalizedMemories: AgentMemory[] = memories.map((memory) => ({
    id: memory.id,
    type: memory.type,
    content: memory.content,
  }));

  logger.debug(`[agent] Retrieved ${normalizedMemories.length} relevant memories`);

  return {
    memories: normalizedMemories,
  };
}
