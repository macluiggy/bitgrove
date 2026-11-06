export const ClaudeHookEvent = {
  SessionStart: 'SessionStart',
  PostToolUse: 'PostToolUse',
  Stop: 'Stop',
} as const;

export type ClaudeHookEvent =
  (typeof ClaudeHookEvent)[keyof typeof ClaudeHookEvent];

export interface ClaudeHookPayload {
  eventName: string;
  cwd: string;
  toolName?: string;
  command?: string;
  stdout?: string;
  stderr?: string;
  interrupted?: boolean;
  stopHookActive?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function parseHookPayload(raw: unknown): ClaudeHookPayload | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const eventName = readString(raw.hook_event_name);
  const cwd = readString(raw.cwd);

  if (eventName === undefined || cwd === undefined) {
    return undefined;
  }

  const payload: ClaudeHookPayload = { eventName, cwd };

  const toolName = readString(raw.tool_name);
  if (toolName !== undefined) {
    payload.toolName = toolName;
  }

  const toolInput = raw.tool_input;
  if (isRecord(toolInput)) {
    const command = readString(toolInput.command);
    if (command !== undefined) {
      payload.command = command;
    }
  }

  const toolResponse = raw.tool_response;
  if (isRecord(toolResponse)) {
    const stdout = readString(toolResponse.stdout);
    if (stdout !== undefined) {
      payload.stdout = stdout;
    }

    const stderr = readString(toolResponse.stderr);
    if (stderr !== undefined) {
      payload.stderr = stderr;
    }

    const interrupted = readBoolean(toolResponse.interrupted);
    if (interrupted !== undefined) {
      payload.interrupted = interrupted;
    }
  }

  const stopHookActive = readBoolean(raw.stop_hook_active);
  if (stopHookActive !== undefined) {
    payload.stopHookActive = stopHookActive;
  }

  return payload;
}
