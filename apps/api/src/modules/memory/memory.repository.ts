import { prisma } from "@project-intelligence/database";

/**
 * Create a memory for a project.
 */
export async function createMemory(input: {
  projectId: string;
  type: "FACT" | "PREFERENCE" | "DECISION" | "CONTEXT";
  content: string;
}) {
  return prisma.memory.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      content: input.content,
    },
    select: {
      id: true,
      projectId: true,
      type: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find all memories belonging to a project.
 */
export async function findProjectMemories(projectId: string) {
  return prisma.memory.findMany({
    where: {
      projectId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      projectId: true,
      type: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
