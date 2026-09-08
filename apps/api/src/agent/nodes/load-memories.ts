import { findProjectMemories } from "../../modules/memory/memory.repository";
import type { AgentMemory, AgentState } from "../state";

/**
 * Load project-level memories into the agent state.
 */
export async function loadMemories(state: AgentState): Promise<Partial<AgentState>> {
  const memories = await findProjectMemories(state.projectId);

  const normalizedMemories: AgentMemory[] = memories.map((memory) => ({
    id: memory.id,
    type: memory.type,
    content: memory.content,
  }));

  return {
    memories: normalizedMemories,
  };
}
