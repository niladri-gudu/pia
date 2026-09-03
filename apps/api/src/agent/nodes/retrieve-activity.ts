import type { DocumentType } from "@project-intelligence/database";
import { searchProjectActivity } from "../../retrieval/activity.repository";
import type { ActivityDateField, ProjectActivity } from "../../retrieval/activity.types";

export interface ActivityRetrievalRequest {
  from: Date;
  to: Date;
  dateField?: ActivityDateField;
  documentTypes?: DocumentType[];
  limit?: number;
}

export async function retrieveActivity(
  projectId: string,
  request: ActivityRetrievalRequest,
): Promise<ProjectActivity[]> {
  return searchProjectActivity({
    projectId,
    from: request.from,
    to: request.to,
    dateField: request.dateField,
    documentTypes: request.documentTypes,
    limit: request.limit,
  });
}
