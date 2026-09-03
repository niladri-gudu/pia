import { agentGraph } from "../agent/graph";

async function main() {
  const projectId = "cmtgx0qbc0003lrh8t604v78b";

  const result = await agentGraph.invoke({
    projectId,
    query:
      "What changes were made to the project this quarter, and what technical risks, regressions, or security issues did those changes introduce?",
  });

  console.log("\n========================================");
  console.log("FINAL AGENT STATE");
  console.log("========================================");

  console.log(
    JSON.stringify(
      {
        retrievalIteration: result.retrievalIteration,
        evidenceSufficient: result.evidenceSufficient,
        missingEvidence: result.missingEvidence,
        retrievedChunks: result.retrievedChunks.length,
        answer: result.answer,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
