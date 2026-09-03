import { END, START, StateGraph } from "@langchain/langgraph";
import { retrieveNode } from "./nodes/retrieve";
import { buildContextNode } from "./nodes/context";
import type { AgentState } from "./state";

const graph = new StateGraph<AgentState>({
  channels: {
    projectId: {
      value: (_, next) => next,
    },
    query: {
      value: (_, next) => next,
    },
    retrievedChunks: {
      value: (_, next) => next,
      default: () => [],
    },
    context: {
      value: (_, next) => next,
      default: () => "",
    },
    answer: {
      value: (_, next) => next,
      default: () => "",
    },
  },
})
  .addNode("retrieve", retrieveNode)
  .addNode("buildContext", buildContextNode)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "buildContext")
  .addEdge("buildContext", END);

export const agentGraph = graph.compile();
