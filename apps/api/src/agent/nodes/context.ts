import type { AgentState } from "../state";

export function buildContextNode(state: AgentState): Partial<AgentState> {
  const memoryContext =
    state.memories && state.memories.length > 0
      ? state.memories.map((memory) => `[${memory.type}] ${memory.content}`).join("\n")
      : "No project memories available.";

  const evidenceContext =
    state.retrievedChunks.length > 0
      ? state.retrievedChunks
          .map((chunk, index) => {
            const source = [
              `Source ${index + 1}`,
              `Title: ${chunk.title}`,
              chunk.url ? `URL: ${chunk.url}` : null,
              chunk.activityAt ? `Activity date: ${chunk.activityAt.toISOString()}` : null,
              chunk.activityDateField ? `Activity date field: ${chunk.activityDateField}` : null,
              `Similarity: ${chunk.similarity.toFixed(4)}`,
            ]
              .filter(Boolean)
              .join("\n");

            return `${source}\n\n${chunk.content}`;
          })
          .join("\n\n---\n\n")
      : "No project evidence available.";

  const context = `PROJECT MEMORIES:

${memoryContext}

---

PROJECT EVIDENCE:

${evidenceContext}`;

  console.log(
    `[agent] Built context from ${state.retrievedChunks.length} chunks and ${
      state.memories?.length ?? 0
    } memories`,
  );

  return {
    context,
  };
}
