import { Router, type IRouter } from "express";
import { addProjectMemory, getProjectMemories } from "./memory.service";
import { createEmbeddingProvider } from "../../indexing/embedding-provider";
import { embedProjectMemories } from "./memory-indexer";

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
    const { type, content } = req.body as {
      type?: "FACT" | "PREFERENCE" | "DECISION" | "CONTEXT";
      content?: string;
    };

    if (!type) {
      return res.status(400).json({
        error: "type is required",
      });
    }

    if (!content?.trim()) {
      return res.status(400).json({
        error: "content is required",
      });
    }

    const memory = await addProjectMemory({
      projectId: req.params.projectId,
      type,
      content: content.trim(),
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
