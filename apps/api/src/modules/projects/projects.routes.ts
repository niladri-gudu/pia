import { Router, type IRouter } from "express";
import {
  getProject,
  getProjects,
  getProjectSyncStatus,
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
