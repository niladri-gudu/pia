import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { logger } from "../../lib/logger";
import {
  createMemory,
  findProjectMemories,
  saveMemoryEmbedding,
  findSimilarMemory,
} from "./memory.repository";

const embeddingProvider = createEmbeddingProvider();

/**
 * Create a new memory for a project and generate its embedding.
 *
 * If a sufficiently similar memory of the same type already exists,
 * the existing memory is returned instead of creating a duplicate.
 */
export async function addProjectMemory(input: {
  projectId: string;
  type: "FACT" | "PREFERENCE" | "DECISION" | "CONTEXT";
  content: string;
}) {
  const embedding = await embeddingProvider.embedQuery(input.content);

  const existingMemory = await findSimilarMemory(input.projectId, input.type, embedding);

  if (existingMemory) {
    logger.debug(
      `[memory] Duplicate detected for project ${input.projectId}: ${existingMemory.id}`,
    );
    return {
      id: existingMemory.id,
      projectId: existingMemory.projectId,
      type: existingMemory.type,
      content: existingMemory.content,
      createdAt: null,
      updatedAt: null,
    };
  }

  logger.debug(`[memory] Creating new memory for project ${input.projectId}`);

  const memory = await createMemory(input);

  await saveMemoryEmbedding(memory.id, embedding);

  return memory;
}

/**
 * Retrieve all memories belonging to a project.
 */
export async function getProjectMemories(projectId: string) {
  return findProjectMemories(projectId);
}
