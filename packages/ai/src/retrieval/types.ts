export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  title: string;
  url?: string;
  similarity: number;
  activityAt?: Date;
  activityDateField?: "occurredAt" | "mergedAt";
}
