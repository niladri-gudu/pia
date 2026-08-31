import { Router, type Router as ExpressRouter } from "express";

import { GithubService, createGithubClient } from "../../integrations";

import prisma from "@project-intelligence/database";

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

    const githubClient = createGithubClient();

    const githubService = new GithubService(githubClient);

    const result = await githubService.syncRepository({
      owner,
      repository,

      workspaceId: project.workspaceId,

      projectId: project.id,
    });

    res.json({
      success: true,

      project: {
        id: project.id,
        name: project.name,
      },

      recordsProcessed: result.documents.length,

      created: result.created,

      updated: result.updated,
    });
  } catch (error) {
    next(error);
  }
});

export { router as githubDevRouter };
