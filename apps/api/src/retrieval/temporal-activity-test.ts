import { prisma } from "@project-intelligence/database";
import { retrieveActivity } from "../agent/nodes/retrieve-activity";
import { resolveTemporalRange } from "./temporal";

const projectId = "cmtgx0qbc0003lrh8t604v78b";

async function main() {
  const now = new Date("2026-09-03T17:18:00Z");

  const { from, to } = resolveTemporalRange("this_quarter", now);

  console.log("\n========================================");
  console.log("TEMPORAL ACTIVITY TEST");
  console.log("========================================");
  console.log(`Range: ${from.toISOString()} → ${to.toISOString()}`);

  const activities = await retrieveActivity(projectId, {
    from,
    to,
    dateField: "occurredAt",
    limit: 10,
  });

  console.log(`Retrieved ${activities.length} activities:\n`);

  for (const activity of activities) {
    console.log(
      `[${activity.documentType}] ${activity.activityAt.toISOString()} - ${activity.title}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
