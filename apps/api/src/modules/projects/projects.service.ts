import { AppError } from "../../middleware/errorHandler";
import {
  createPendingSyncJob,
  findActiveSyncJob,
  findLatestSyncJob,
  findProjectById,
  findProjectForSync,
  findProjects,
} from "./projects.repository";
import { enqueueGithubSyncJob } from "../../workers/queues";

/**
 * Return all projects.
 */
export async function getProjects() {
  return findProjects();
}

/**
 * Return a single project with its latest sync job.
 */
export async function getProject(projectId: string) {
  const project = await findProjectById(projectId);

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const { syncJobs, ...projectData } = project;

  return {
    ...projectData,
    latestSync: syncJobs[0] ?? null,
  };
}

/**
 * Return the latest sync status for a project.
 */
export async function getProjectSyncStatus(projectId: string) {
  const project = await findProjectForSync(projectId);

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const syncJob = await findLatestSyncJob(projectId);

  return {
    projectId,
    syncJob,
  };
}

/**
 * Trigger a GitHub sync for a project.
 */
export async function triggerProjectSync(projectId: string) {
  const project = await findProjectForSync(projectId);

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  if (project.sourceType !== "GITHUB") {
    throw new AppError(400, "Only GitHub project sync is currently supported");
  }

  const activeSync = await findActiveSyncJob(projectId);

  if (activeSync) {
    throw new AppError(409, `A sync is already ${activeSync.status.toLowerCase()}`);
  }

  const syncJob = await createPendingSyncJob({
    workspaceId: project.workspaceId,
    connectionId: project.connectionId,
    projectId: project.id,
    provider: "GITHUB",
  });

  const queueJobId = await enqueueGithubSyncJob(project.id, syncJob.id);

  return {
    syncJob,
    queueJobId,
  };
}
