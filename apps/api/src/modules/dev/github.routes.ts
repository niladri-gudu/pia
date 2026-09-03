import { Router, type Router as ExpressRouter } from "express";
import prisma from "@project-intelligence/database";
import { enqueueGithubSyncJob, enqueueEmbeddingIndexJob } from "../../workers/queues";
import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { VectorRetriever } from "../../retrieval/retriever";
import { agentGraph } from "../../agent/graph";

const router: ExpressRouter = Router();

router.post("/github/sync/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Project not found",
      });

      return;
    }

    if (project.sourceType !== "GITHUB") {
      res.status(400).json({
        error: "INVALID_SOURCE",
        message: "The selected project is not a GitHub project",
      });

      return;
    }

    const [owner, repository] = project.externalId.split("/");

    if (!owner || !repository) {
      res.status(400).json({
        error: "INVALID_PROJECT",
        message:
          "Github project externalId is invalid. It should be in the format 'owner/repository'",
      });

      return;
    }

    const activeSyncJob = await prisma.syncJob.findFirst({
      where: {
        projectId: project.id,
        provider: "GITHUB",
        status: {
          in: ["PENDING", "RUNNING"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (activeSyncJob) {
      res.status(409).json({
        error: "SYNC_IN_PROGRESS",
        message: "A GitHub synchronization is already in progress for this project",
        syncJob: {
          id: activeSyncJob.id,
          status: activeSyncJob.status,
        },
      });

      return;
    }

    const syncJob = await prisma.syncJob.create({
      data: {
        workspaceId: project.workspaceId,
        connectionId: project.connectionId,
        projectId: project.id,
        provider: "GITHUB",
        status: "PENDING",
      },
    });

    const queueJobId = await enqueueGithubSyncJob(project.id, syncJob.id);

    res.status(202).json({
      success: true,

      project: {
        id: project.id,
        name: project.name,
      },

      syncJob: {
        id: syncJob.id,
        status: syncJob.status,
      },

      queueJobId,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/github/sync/:projectId/status", async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        sourceType: true,
      },
    });

    if (!project) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Project not found",
      });

      return;
    }

    if (project.sourceType !== "GITHUB") {
      res.status(400).json({
        error: "INVALID_SOURCE",
        message: "The selected project is not a GitHub project",
      });

      return;
    }

    const syncJob = await prisma.syncJob.findFirst({
      where: {
        projectId,
        provider: "GITHUB",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!syncJob) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "No GitHub synchronization has been started for this project",
      });

      return;
    }

    res.json({
      success: true,

      project: {
        id: project.id,
        name: project.name,
      },

      syncJob: {
        id: syncJob.id,
        status: syncJob.status,
        startedAt: syncJob.startedAt,
        completedAt: syncJob.completedAt,
        recordsProcessed: syncJob.recordsProcessed,
        error: syncJob.error,
        createdAt: syncJob.createdAt,
        updatedAt: syncJob.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/github/index/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Project not found",
      });

      return;
    }

    if (project.sourceType !== "GITHUB") {
      res.status(400).json({
        error: "INVALID_SOURCE",
        message: "The selected project is not a GitHub project",
      });

      return;
    }

    const chunk = await prisma.documentChunk.findFirst({
      where: {
        document: {
          projectId,
          sourceType: "GITHUB",
        },
      },
    });

    if (!chunk) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "No document chunks found for this project",
      });

      return;
    }

    const jobId = await enqueueEmbeddingIndexJob(projectId);

    res.status(202).json({
      success: true,

      project: {
        id: project.id,
        name: project.name,
      },

      indexingJob: {
        id: jobId,
        status: "QUEUED",
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/github/search/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const query = typeof req.query.q === "string" ? req.query.q : "";

    if (!query.trim()) {
      res.status(400).json({
        error: "INVALID_QUERY",
        message: "Query parameter 'q' is required",
      });

      return;
    }

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Project not found",
      });

      return;
    }

    if (project.sourceType !== "GITHUB") {
      res.status(400).json({
        error: "INVALID_SOURCE",
        message: "The selected project is not a GitHub project",
      });

      return;
    }

    const embeddingProvider = createEmbeddingProvider();
    const retriever = new VectorRetriever(embeddingProvider);

    const results = await retriever.retrieve(query, {
      projectId,
      topK: 5,
    });

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
      },
      query,
      results,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/github/agent/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const query = typeof req.query.q === "string" ? req.query.q : "";

    if (!query.trim()) {
      res.status(400).json({
        error: "INVALID_QUERY",
        message: "Query Parameter 'q' is required",
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Project not found",
      });
      return;
    }

    if (project.sourceType !== "GITHUB") {
      res.status(400).json({
        error: "INVALID_SOURCE",
        message: "The selected project is not a GitHub project",
      });
      return;
    }

    const result = await agentGraph.invoke({
      projectId,
      query,
    });

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
      },
      query,
      answer: result.answer,
      sources: result.retrievedChunks.map((chunk) => ({
        title: chunk.title,
        url: chunk.url,
        similarity: chunk.similarity,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export { router as githubDevRouter };
