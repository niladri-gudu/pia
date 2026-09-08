import {
  createMemory,
  findProjectMemories,
} from "./memory.repository";

/**
 * Create a new memory for a project.
 */
export async function addProjectMemory(input: {
  projectId: string;
  type: "FACT" | "PREFERENCE" | "DECISION" | "CONTEXT";
  content: string;
}) {
  return createMemory(input);
}

/**
 * Retrieve all memories belonging to a project.
 */
export async function getProjectMemories(projectId: string) {
  return findProjectMemories(projectId);
}