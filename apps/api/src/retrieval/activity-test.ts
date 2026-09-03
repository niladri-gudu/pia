import { searchProjectActivity } from "./activity.repository";

const projectId = "cmtgx0qbc0003lrh8t604v78b";

async function main() {
  const from = new Date("2026-01-01T00:00:00Z");
  const to = new Date("2027-01-01T00:00:00Z");

  console.log("=== Recent project activity ===");

  const activity = await searchProjectActivity({
    projectId,
    from,
    to,
    limit: 10,
  });

  for (const item of activity) {
    console.log({
      type: item.documentType,
      title: item.title,
      occurredAt: item.occurredAt.toISOString(),
      activityAt: item.activityAt.toISOString(),
      activityDateField: item.activityDateField,
      url: item.url,
    });
  }

  console.log(`\nFound ${activity.length} activities.`);

  console.log("\n=== Recently merged PRs ===");

  const mergedPrs = await searchProjectActivity({
    projectId,
    from,
    to,
    dateField: "mergedAt",
    documentTypes: ["PULL_REQUEST"],
    limit: 10,
  });

  for (const item of mergedPrs) {
    console.log({
      type: item.documentType,
      title: item.title,
      createdAt: item.occurredAt.toISOString(),
      activityAt: item.activityAt.toISOString(),
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
