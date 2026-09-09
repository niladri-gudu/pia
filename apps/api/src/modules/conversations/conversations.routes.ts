import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  getProjectConversations,
  getConversationMessages,
  sendConversationMessage,
  startConversation,
} from "./conversations.service";

const createConversationSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().max(200).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export const conversationsRouter: IRouter = Router();

/**
 * POST /conversations
 *
 * Create a new conversation for a project.
 */
conversationsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createConversationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request payload",
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const conversation = await startConversation(parsed.data);

    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /conversations/project/:projectId
 *
 * Get all conversations belonging to a project.
 */
conversationsRouter.get("/project/:projectId", async (req, res, next) => {
  try {
    const conversations = await getProjectConversations(req.params.projectId);

    res.json({
      data: conversations,
    });
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
    const parsed = sendMessageSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request payload",
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await sendConversationMessage({
      conversationId: req.params.id,
      content: parsed.data.content,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
