import type { AgentState } from "../state";

export function buildContextNode(state: AgentState): Partial<AgentState> {
  const context = state.retrievedChunks
    .map((chunk, index) => {
      const source = [
        `Source ${index + 1}`,
        `Title: ${chunk.title}`,
        chunk.url ? `URL: ${chunk.url}` : null,
        `Similarity: ${chunk.similarity.toFixed(4)}`,
      ]
        .filter(Boolean)
        .join("\n");

      return `${source}\n\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

  console.log(`[agent] Built context from ${state.retrievedChunks.length} chunks`);

  return {
    context,
  };
}
