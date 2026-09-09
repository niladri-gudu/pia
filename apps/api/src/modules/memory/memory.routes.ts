import { Router, type IRouter } from "express";
import { z } from "zod";
import { addProjectMemory, getProjectMemories } from "./memory.service";
import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { embedProjectMemories } from "./memory-indexer";

const createMemorySchema = z.object({
  type: z.enum(["FACT", "PREFERENCE", "DECISION", "CONTEXT"]),
  content: z.string().trim().min(1).max(2000),
});

export const memoryRouter: IRouter = Router();

/**
 * GET /memory/project/:projectId
 *
 * Get all memories belonging to a project.
 */
memoryRouter.get("/project/:projectId", async (req, res, next) => {
  try {
    const memories = await getProjectMemories(req.params.projectId);

    res.json({
      data: memories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /memory/project/:projectId
 *
 * Create a memory for a project.
 */
memoryRouter.post("/project/:projectId", async (req, res, next) => {
  try {
    const parsed = createMemorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request payload",
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const memory = await addProjectMemory({
      projectId: req.params.projectId,
      ...parsed.data,
    });

    res.status(201).json(memory);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /memory/project/:projectId/embed
 *
 * Generate embeddings for project memories that do not have one yet.
 */
memoryRouter.post("/project/:projectId/embed", async (req, res, next) => {
  try {
    const provider = createEmbeddingProvider();

    const processed = await embedProjectMemories(provider, req.params.projectId);

    res.json({
      success: true,
      projectId: req.params.projectId,
      processed,
    });
  } catch (error) {
    next(error);
  }
});
