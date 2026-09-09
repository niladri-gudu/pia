import { Router, type IRouter } from "express";
import {
  getProject,
  getProjects,
  getProjectSyncStatus,
  runProjectAgentQuery,
  searchProjectDocuments,
  triggerProjectSync,
} from "./projects.service";

export const projectsRouter: IRouter = Router();

/**
 * GET /projects
 *
 * List all projects.
 */
projectsRouter.get("/", async (_req, res, next) => {
  try {
    const projects = await getProjects();

    res.json({
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id
 *
 * Get a project with its latest sync job.
 */
projectsRouter.get("/:id", async (req, res, next) => {
  try {
    const project = await getProject(req.params.id);

    res.json(project);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id/sync-status
 *
 * Get latest sync status.
 */
projectsRouter.get("/:id/sync-status", async (req, res, next) => {
  try {
    const result = await getProjectSyncStatus(req.params.id);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:id/sync
 *
 * Trigger GitHub sync.
 */
projectsRouter.post("/:id/sync", async (req, res, next) => {
  try {
    const result = await triggerProjectSync(req.params.id);

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id/search?q=
 *
 * Semantic search over the project's indexed document chunks.
 */
projectsRouter.get("/:id/search", async (req, res, next) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";

    const result = await searchProjectDocuments(req.params.id, query);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id/agent?q=
 *
 * One-shot agent query with grounded, cited answers.
 */
projectsRouter.get("/:id/agent", async (req, res, next) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";

    const result = await runProjectAgentQuery(req.params.id, query);

    res.json(result);
  } catch (error) {
    next(error);
  }
});
