import { healthResponseSchema, type HealthResponse } from "@project-intelligence/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface Project {
  id: string;
  name: string;
  externalId: string;
  sourceType: "GITHUB" | "JIRA";
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJob {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  recordsProcessed: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
}

export interface ProjectDetails extends Project {
  latestSync: SyncJob | null;
}

export interface SyncResponse {
  success: boolean;
  jobId: string;
}

export interface AgentSource {
  title: string;
  url: string | null;
  similarity: number;
}

export interface AgentResponse {
  success: boolean;
  answer: string;
  sources: AgentSource[];
}

export interface SearchResult {
  id: string;
  documentId: string;
  chunkId: string;
  title: string;
  content: string;
  url: string | null;
  similarity: number;
}

export interface ProjectSearchResponse {
  success: boolean;
  project: {
    id: string;
    name: string;
  };
  query: string;
  results: SearchResult[];
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSource {
  title: string;
  url: string | null;
  similarity: number;
}

export interface ConversationMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sources: ConversationSource[] | null;
  createdAt: string;
}

export interface ConversationMessagesResponse {
  data: ConversationMessage[];
}

export interface SendConversationMessageResponse {
  userMessage: {
    content: string;
  };
  assistantMessage: ConversationMessage;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }

  return healthResponseSchema.parse(await res.json());
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch projects: ${res.status}`);
  }

  const data = (await res.json()) as { data: Project[] };

  return data.data;
}

export async function fetchProject(projectId: string): Promise<ProjectDetails> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch project: ${res.status}`);
  }

  return (await res.json()) as ProjectDetails;
}

export async function startProjectSync(projectId: string): Promise<SyncResponse> {
  const res = await fetch(`${API_BASE_URL}/dev/github/sync/${projectId}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Failed to start sync: ${res.status}`);
  }

  return (await res.json()) as SyncResponse;
}

export async function fetchProjectSyncStatus(projectId: string): Promise<SyncJob | null> {
  const res = await fetch(`${API_BASE_URL}/dev/github/sync/${projectId}/status`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sync status: ${res.status}`);
  }

  const data = (await res.json()) as {
    data?: SyncJob | null;
  };

  return data.data ?? null;
}

export async function askProjectAgent(projectId: string, question: string): Promise<AgentResponse> {
  const params = new URLSearchParams({
    q: question,
  });

  const res = await fetch(`${API_BASE_URL}/dev/github/agent/${projectId}?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Agent request failed with status ${res.status}`);
  }

  return (await res.json()) as AgentResponse;
}

export async function searchProject(
  projectId: string,
  query: string,
): Promise<ProjectSearchResponse> {
  const params = new URLSearchParams({
    q: query,
  });

  const res = await fetch(`${API_BASE_URL}/dev/github/search/${projectId}?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Project search failed with status ${res.status}`);
  }

  return (await res.json()) as ProjectSearchResponse;
}

export async function createConversation(projectId: string, title?: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE_URL}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
      title,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create conversation: ${res.status}`);
  }

  return (await res.json()) as Conversation;
}

export async function fetchConversationMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch conversation messages: ${res.status}`);
  }

  const data = (await res.json()) as ConversationMessagesResponse;

  return data.data;
}

export async function sendConversationMessage(
  conversationId: string,
  content: string,
): Promise<SendConversationMessageResponse> {
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send conversation message: ${res.status}`);
  }

  return (await res.json()) as SendConversationMessageResponse;
}
