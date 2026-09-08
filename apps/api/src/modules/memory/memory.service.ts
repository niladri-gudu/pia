import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { createMemory, findProjectMemories, saveMemoryEmbedding } from "./memory.repository";

const embeddingProvider = createEmbeddingProvider();

/**
 * Create a new memory for a project and generate its embedding.
 */
export async function addProjectMemory(input: {
  projectId: string;
  type: "FACT" | "PREFERENCE" | "DECISION" | "CONTEXT";
  content: string;
}) {
  const memory = await createMemory(input);

  const embedding = await embeddingProvider.embedQuery(memory.content);

  await saveMemoryEmbedding(memory.id, embedding);

  return memory;
}

/**
 * Retrieve all memories belonging to a project.
 */
export async function getProjectMemories(projectId: string) {
  return findProjectMemories(projectId);
}
