import { retrieveActivity } from "./retrieve-activity";

const projectId = "cmtgx0qbc0003lrh8t604v78b";

async function main() {
  const from = new Date("2026-08-01T00:00:00Z");
  const to = new Date("2026-09-01T00:00:00Z");

  console.log("=== Agent Activity Retrieval ===");

  const activity = await retrieveActivity(projectId, {
    from,
    to,
    limit: 5,
  });

  for (const item of activity) {
    console.log({
      type: item.documentType,
      title: item.title,
      activityAt: item.activityAt.toISOString(),
      activityDateField: item.activityDateField,
      url: item.url,
    });
  }

  console.log(`\nFound ${activity.length} activities.`);

  console.log("\n=== Agent Merged PR Retrieval ===");

  const mergedPrs = await retrieveActivity(projectId, {
    from,
    to,
    dateField: "mergedAt",
    documentTypes: ["PULL_REQUEST"],
    limit: 5,
  });

  for (const item of mergedPrs) {
    console.log({
      type: item.documentType,
      title: item.title,
      createdAt: item.occurredAt.toISOString(),
      mergedAt: item.activityAt.toISOString(),
      activityDateField: item.activityDateField,
      url: item.url,
    });
  }

  console.log(`\nFound ${mergedPrs.length} merged PRs.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
