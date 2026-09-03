import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { VectorRetriever } from "../../retrieval/retriever";
import type { AgentState } from "../state";

export async function retrieveNode(state: AgentState): Promise<Partial<AgentState>> {
  const embeddingProvider = createEmbeddingProvider();
  const retriever = new VectorRetriever(embeddingProvider);

  const retrievedChunks = await retriever.retrieve(state.query, {
    projectId: state.projectId,
    topK: 5,
  });

  console.log(`[agent] Retrieved ${retrievedChunks.length} chunks for query: ${state.query}`);

  return {
    retrievedChunks,
  };
}
