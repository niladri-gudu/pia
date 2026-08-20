import { Router } from "express";
import { enqueueSystemPing } from "../../workers/queues.js";

/**
 * Development-only routes to verify the background-job pipeline.
 * Mounted only when NODE_ENV !== "production".
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
