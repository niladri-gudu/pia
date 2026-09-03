import type { DocumentType, DocumentSourceType } from "@project-intelligence/database";

export type ActivityDateField = "occurredAt" | "mergedAt";

export interface ProjectActivity {
  id: string;
  sourceId: string;
  documentType: DocumentType;
  sourceType: DocumentSourceType;
  title: string;
  content: string;
  url?: string;
  author?: string;
  occurredAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface ActivityRetrievalOptions {
  projectId: string;
  from: Date;
  to: Date;
  dateField?: ActivityDateField;
  documentTypes?: DocumentType[];
  limit?: number;
}
