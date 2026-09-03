import { decomposeNode } from "../agent/nodes/decompose.js";
import type { AgentState } from "../agent/state.js";

const queries = [
  "Summarize what changed in the project this quarter and identify basic risks.",
  "What causes a fiber to remount when a component kind changes?",
];

async function main(): Promise<void> {
  for (const query of queries) {
    const state: AgentState = {
      projectId: "cmtgx0qbc0003lrh8t604v78b",
      query,
      subQuestions: [
        {
          question: "some question",
          strategy: "semantic",
        },
      ],
      retrievedChunks: [],
      evidence: [],
      evidenceSufficient: false,
      missingEvidence: [],
      retrievalIteration: 0,
      context: "",
      answer: "",
    };

    const result = await decomposeNode(state);

    console.log("\n========================================");
    console.log(`QUERY: ${query}`);
    console.log("========================================");
    console.log(JSON.stringify(result.subQuestions, null, 2));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
