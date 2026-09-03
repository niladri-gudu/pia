import { agentGraph } from "../agent/graph";

const PROJECT_ID = "cmtgx0qbc0003lrh8t604v78b";

const queries = [
  "Summarize what changed in the project this quarter and identify basic risks.",
  "What causes a fiber to remount when a component kind changes?",
];

async function main(): Promise<void> {
  for (const query of queries) {
    console.log("\n\n========================================");
    console.log(`QUERY: ${query}`);
    console.log("========================================");

    const result = await agentGraph.invoke({
      projectId: PROJECT_ID,
      query,
    });

    console.log("\nSUBQUESTIONS:");
    console.log(JSON.stringify(result.subQuestions, null, 2));

    console.log("\nRETRIEVAL ITERATION:");
    console.log(result.retrievalIteration);

    console.log("\nEVIDENCE SUFFICIENT:");
    console.log(result.evidenceSufficient);

    console.log("\nMISSING EVIDENCE:");
    console.log(JSON.stringify(result.missingEvidence, null, 2));

    console.log("\nRETRIEVED CHUNKS:");
    console.log(result.retrievedChunks.length);

    console.log("\nANSWER:");
    console.log(result.answer);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
