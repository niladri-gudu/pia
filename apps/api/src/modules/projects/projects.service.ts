import { AppError } from "../../middleware/errorHandler";
import {
  createPendingSyncJob,
  findActiveSyncJob,
  findLatestSyncJob,
  findProjectBasic,
  findProjectById,
  findProjectForSync,
  findProjects,
  projectHasDocumentChunks,
} from "./projects.repository";
import { enqueueGithubSyncJob, enqueueEmbeddingIndexJob } from "../../workers/queues";
import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { VectorRetriever } from "../../retrieval/retriever";
import { agentGraph } from "../../agent/graph";
import { collectAnswerSources } from "../../agent/citations";

/** User-safe message shown whenever a sync job previously failed. */
const SYNC_FAILED_MESSAGE = "The last synchronization failed. You can try syncing again.";

/**
 * Replace the raw internal error stored on a sync job with a user-safe
 * message. Raw errors may contain provider (GitHub) response bodies and
 * must not be exposed to clients.
 */
function toPublicSyncError(error: string | null | undefined): string | null {
  return error ? SYNC_FAILED_MESSAGE : null;
}

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

  const [latestSync] = syncJobs;

  return {
    ...projectData,
    latestSync: latestSync
      ? {
          ...latestSync,
          error: toPublicSyncError(latestSync.error),
        }
      : null,
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
    syncJob: syncJob
      ? {
          ...syncJob,
          error: toPublicSyncError(syncJob.error),
        }
      : null,
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

/**
 * Enqueue a re-indexing job for a project (chunking + embeddings).
 *
 * Normally indexing is chained automatically after a successful sync;
 * this exists as an explicit trigger for debugging/backfills.
 */
export async function triggerProjectIndexing(projectId: string) {
  const project = await requireGithubProject(projectId);

  const hasChunks = await projectHasDocumentChunks(projectId);

  if (!hasChunks) {
    throw new AppError(
      404,
      "No document chunks found for this project. Sync the project first.",
    );
  }

  const jobId = await enqueueEmbeddingIndexJob(projectId);

  return {
    project: {
      id: project.id,
      name: project.name,
    },
    indexingJob: {
      id: jobId,
      status: "QUEUED",
    },
  };
}

/**
 * Validate that a project exists and is a GitHub project before running
 * retrieval or agent queries against it.
 */
async function requireGithubProject(projectId: string) {
  const project = await findProjectBasic(projectId);

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  if (project.sourceType !== "GITHUB") {
    throw new AppError(400, "Only GitHub projects are currently supported");
  }

  return project;
}

/**
 * Run a semantic search over a project's indexed document chunks.
 */
export async function searchProjectDocuments(projectId: string, query: string) {
  if (!query.trim()) {
    throw new AppError(400, "Query parameter 'q' is required");
  }

  const project = await requireGithubProject(projectId);

  const embeddingProvider = createEmbeddingProvider();
  const retriever = new VectorRetriever(embeddingProvider);

  const results = await retriever.retrieve(query, {
    projectId,
    topK: 5,
  });

  return {
    project: {
      id: project.id,
      name: project.name,
    },
    query,
    results,
  };
}

/**
 * Run a one-shot agent query for a project.
 */
export async function runProjectAgentQuery(projectId: string, query: string) {
  if (!query.trim()) {
    throw new AppError(400, "Query parameter 'q' is required");
  }

  const project = await requireGithubProject(projectId);

  const result = await agentGraph.invoke({
    projectId,
    query,
  });

  return {
    project: {
      id: project.id,
      name: project.name,
    },
    query,
    answer: result.answer,
    sources: collectAnswerSources(result.answer, result.retrievedChunks),
  };
}
