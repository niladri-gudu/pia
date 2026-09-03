import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { VectorRetriever } from "../../retrieval/retriever";
import type { RetrievedChunk } from "../../retrieval/types";
import type { AgentState, RetrievedEvidence } from "../state";

export async function retrieveNode(state: AgentState): Promise<Partial<AgentState>> {
  const embeddingProvider = createEmbeddingProvider();
  const retriever = new VectorRetriever(embeddingProvider);

  const questions = state.subQuestions.length > 0 ? state.subQuestions : [state.query];

  const results = await Promise.all(
    questions.map(async (question): Promise<RetrievedEvidence> => {
      const chunks = await retriever.retrieve(question, {
        projectId: state.projectId,
        topK: 5,
      });

      return {
        subQuestion: question,
        chunks,
      };
    }),
  );

  const retrievedChunks: RetrievedChunk[] = [];
  const seenChunks = new Set<string>();

  for (const result of results) {
    for (const chunk of result.chunks) {
      if (seenChunks.has(chunk.id)) continue;

      seenChunks.add(chunk.id);
      retrievedChunks.push(chunk);
    }
  }

  console.log(
    `[agent] Retrieved ${retrievedChunks.length} unique chunks from ${questions.length} questions`,
  );

  return {
    retrievedChunks,
    evidence: results,
  };
}
