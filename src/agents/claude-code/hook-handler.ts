import { basename } from 'node:path';
import {
  checkBedtime,
  type Deps,
  recordAccomplishment,
  startSession,
  syncCommits,
} from '../../application';
import { renderBedtime, renderOvernight } from '../../presentation';
import { detectAccomplishment } from './detectors';
import { ClaudeHookEvent, parseHookPayload } from './hook-payload';

export const CLAUDE_CODE_AGENT_ID = 'claude-code';

const TOOL_NAMES = {
  Bash: 'Bash',
} as const;

export function handleClaudeHook(
  raw: unknown,
  deps: Deps,
): { systemMessage: string } | undefined {
  const payload = parseHookPayload(raw);

  if (payload === undefined) {
    return undefined;
  }

  const project = basename(payload.cwd);
  const activity = { project, agent: CLAUDE_CODE_AGENT_ID };

  if (payload.eventName === ClaudeHookEvent.SessionStart) {
    syncCommits(deps, activity, payload.cwd);
    const report = startSession(deps, activity);
    return report === undefined
      ? undefined
      : { systemMessage: renderOvernight(report) };
  }

  if (payload.eventName === ClaudeHookEvent.PostToolUse) {
    if (payload.toolName !== TOOL_NAMES.Bash || payload.command === undefined) {
      return undefined;
    }

    const detected = detectAccomplishment({
      command: payload.command,
      stdout: payload.stdout ?? '',
      stderr: payload.stderr ?? '',
      interrupted: payload.interrupted ?? false,
    });

    if (detected === undefined) {
      return undefined;
    }

    recordAccomplishment(deps, activity, detected);
    return undefined;
  }

  if (payload.eventName === ClaudeHookEvent.Stop) {
    if (payload.stopHookActive === true) {
      return undefined;
    }

    syncCommits(deps, activity, payload.cwd);

    return checkBedtime(deps, activity)
      ? { systemMessage: renderBedtime() }
      : undefined;
  }

  return undefined;
}
