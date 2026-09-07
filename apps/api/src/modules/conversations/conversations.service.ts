import { agentGraph } from "../../agent/graph";
import { AppError } from "../../middleware/errorHandler";
import {
  createConversation,
  updateConversationTitle,
  createMessage,
  findConversationById,
  findConversationMessages,
  findProjectConversations,
} from "./conversations.repository";

/**
 * Create a new conversation for a project.
 */
export async function startConversation(input: { projectId: string; title?: string }) {
  return createConversation(input);
}

/**
 * Return all conversations belonging to a project.
 */
export async function getProjectConversations(projectId: string) {
  return findProjectConversations(projectId);
}

/**
 * Return all messages belonging to a conversation.
 */
export async function getConversationMessages(conversationId: string) {
  const conversation = await findConversationById(conversationId);

  if (!conversation) {
    throw new AppError(404, "Conversation not found");
  }

  return findConversationMessages(conversationId);
}

/**
 * Send a user message, run the project intelligence agent,
 * and persist both the user and assistant messages.
 */
export async function sendConversationMessage(input: { conversationId: string; content: string }) {
  const conversation = await findConversationById(input.conversationId);

  if (!conversation) {
    throw new AppError(404, "Conversation not found");
  }

  const previousMessages = await findConversationMessages(input.conversationId);

  await createMessage({
    conversationId: input.conversationId,
    role: "USER",
    content: input.content,
  });

  if (previousMessages.length === 0 && conversation.title === "Project chat") {
    const title = input.content.length > 60 ? `${input.content.slice(0, 57)}...` : input.content;

    await updateConversationTitle(input.conversationId, title);
  }

  const conversationHistory = previousMessages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  conversationHistory.push({
    role: "USER",
    content: input.content,
  });

  const result = await agentGraph.invoke({
    projectId: conversation.projectId,
    conversationId: conversation.id,
    query: input.content,
    conversationHistory,
  });

  const sources = result.retrievedChunks.map((chunk) => ({
    title: chunk.title,
    url: chunk.url ?? null,
    similarity: chunk.similarity,
  }));

  const assistantMessage = await createMessage({
    conversationId: input.conversationId,
    role: "ASSISTANT",
    content: result.answer,
    sources,
  });

  return {
    userMessage: {
      content: input.content,
    },
    assistantMessage,
  };
}
