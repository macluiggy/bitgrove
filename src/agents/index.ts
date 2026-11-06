import { type AgentAdapter, claudeCodeAgent } from './claude-code';

export type { AgentAdapter } from './claude-code';

export const AGENTS = {
  'claude-code': claudeCodeAgent,
} as const;

export type AgentId = keyof typeof AGENTS;

export function getAgent(id: string): AgentAdapter | undefined {
  if (Object.hasOwn(AGENTS, id)) {
    return AGENTS[id as AgentId];
  }

  return undefined;
}
