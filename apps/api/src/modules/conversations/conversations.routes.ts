import { Router, type IRouter } from "express";
import {
  getConversationMessages,
  sendConversationMessage,
  startConversation,
} from "./conversations.service";

export const conversationsRouter: IRouter = Router();

/**
 * POST /conversations
 *
 * Create a new conversation for a project.
 */
conversationsRouter.post("/", async (req, res, next) => {
  try {
    const { projectId, title } = req.body as {
      projectId?: string;
      title?: string;
    };

    if (!projectId) {
      return res.status(400).json({
        error: "projectId is required",
      });
    }

    const conversation = await startConversation({
      projectId,
      title,
    });

    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /conversations/:id/messages
 *
 * Get all messages for a conversation.
 */
conversationsRouter.get("/:id/messages", async (req, res, next) => {
  try {
    const messages = await getConversationMessages(req.params.id);

    res.json({
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /conversations/:id/messages
 *
 * Send a message to the project intelligence agent.
 */
conversationsRouter.post("/:id/messages", async (req, res, next) => {
  try {
    const { content } = req.body as {
      content?: string;
    };

    if (!content?.trim()) {
      return res.status(400).json({
        error: "content is required",
      });
    }

    const result = await sendConversationMessage({
      conversationId: req.params.id,
      content: content.trim(),
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
