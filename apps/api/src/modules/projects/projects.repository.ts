import { prisma } from "@project-intelligence/database";

/**
 * Project database access layer.
 *
 * Prisma access should remain inside repository files.
 */
export async function findProjects() {
  return prisma.project.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      externalId: true,
      sourceType: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find a project by id.
 *
 * Includes the latest sync job so callers can display sync status.
 */
export async function findProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      name: true,
      externalId: true,
      sourceType: true,
      sourceUrl: true,
      createdAt: true,
      updatedAt: true,
      syncJobs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          recordsProcessed: true,
          startedAt: true,
          completedAt: true,
          error: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Find only the latest sync job for a project.
 */
export async function findLatestSyncJob(projectId: string) {
  return prisma.syncJob.findFirst({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      recordsProcessed: true,
      startedAt: true,
      completedAt: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find a project with the connection information needed to create a sync job.
 */
export async function findProjectForSync(projectId: string) {
  return prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      workspaceId: true,
      connectionId: true,
      sourceType: true,
    },
  });
}

/**
 * Check whether a project already has an active sync job.
 */
export async function findActiveSyncJob(projectId: string) {
  return prisma.syncJob.findFirst({
    where: {
      projectId,
      status: {
        in: ["PENDING", "RUNNING"],
      },
    },
    select: {
      id: true,
      status: true,
    },
  });
}

/**
 * Create a pending sync job.
 */
export async function createPendingSyncJob(input: {
  workspaceId: string;
  connectionId: string;
  projectId: string;
  provider: "GITHUB" | "JIRA";
}) {
  return prisma.syncJob.create({
    data: {
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
      projectId: input.projectId,
      provider: input.provider,
      status: "PENDING",
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });
}
