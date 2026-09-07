import { prisma } from "@project-intelligence/database";

/**
 * Create a new conversation for a project.
 */
export async function createConversation(input: { projectId: string; title?: string }) {
  return prisma.conversation.create({
    data: {
      projectId: input.projectId,
      title: input.title,
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find all conversations belonging to a project.
 */
export async function findProjectConversations(projectId: string) {
  return prisma.conversation.findMany({
    where: {
      projectId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find a conversation by id.
 */
export async function findConversationById(conversationId: string) {
  return prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Get messages for a conversation in chronological order.
 */
export async function findConversationMessages(conversationId: string) {
  return prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      role: true,
      content: true,
      sources: true,
      createdAt: true,
    },
  });
}

/**
 * Create a message in a conversation.
 */
export async function createMessage(input: {
  conversationId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sources?: Array<{
    title: string;
    url: string | null;
    similarity: number;
  }>;
}) {
  return prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      sources: input.sources,
    },
    select: {
      id: true,
      role: true,
      content: true,
      sources: true,
      createdAt: true,
    },
  });
}
