import { Router } from "express";
import { enqueueSystemPing } from "../../workers/queues.js";
import { triggerProjectIndexing } from "../projects/projects.service.js";

/**
 * Development-only routes. Mounted only when NODE_ENV !== "production".
 *
 * All real functionality is exposed through product routes under
 * /projects, /conversations and /memory. These routes exist purely to
 * verify/debug the background-job pipeline.
 */
export const devRouter: Router = Router();

devRouter.post("/jobs/system", async (_req, res, next) => {
  try {
    const jobId = await enqueueSystemPing();
    res.status(202).json({ enqueued: true, queue: "system", jobId });
  } catch (err) {
    next(err);
  }
});

devRouter.post("/github/index/:projectId", async (req, res, next) => {
  try {
    const result = await triggerProjectIndexing(req.params.projectId);

    res.status(202).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});
