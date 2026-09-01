import { Router, type Router as ExpressRouter } from "express";

import prisma from "@project-intelligence/database";

import { enqueueGithubSyncJob } from "../../workers/queues";

import { indexDocumentChunks } from "../../indexing/document-indexer";

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

    const documents = await prisma.document.findMany({
      where: {
        projectId,
        sourceType: "GITHUB",
      }
    })

    if (documents.length === 0) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "No documents found for this project",
      })

      return
    }

    let chunksCreated = 0;

    for (const document of documents) {
      const chunksCount = await indexDocumentChunks(document.id, {
        sourceType: document.sourceType,
        sourceId: document.sourceId,
        documentType: document.documentType,
        title: document.title,
        content: document.content,
        ...(document.url ? { url: document.url } : {}),
        ...(document.author ? { author: document.author } : {}),
        ...(document.occurredAt ? { occurredAt: document.occurredAt } : {}),
        ...(document.metadata
          ? { metadata: document.metadata as Record<string, unknown> }
          : {}),
      })

      chunksCreated += chunksCount;
    }

    res.json({
      success: true,
      projectId,
      documentsProcessed: documents.length,
      chunksCreated,
    })
  } catch (error) {
    next(error)
  }
})

export { router as githubDevRouter };
