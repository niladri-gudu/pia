/**
 * LangGraph workflow placeholder.
 *
 * The multi-step agent (plan -> retrieve -> reason -> answer -> cite) will be
 * assembled here using @langchain/langgraph. It is intentionally not
 * implemented in this foundation phase.
 */
export function createAgentGraph(): never {
  throw new Error(
    "LangGraph agent graph is not implemented yet (foundation phase only). " +
      "See packages/ai/src/langgraph for the intended structure.",
  );
}
