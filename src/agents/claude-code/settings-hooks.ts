import { ClaudeHookEvent } from './hook-payload';

// Our handlers are recognized only by the exact launcher invocation, never by a
// loose substring, so a user's own hook mentioning "bitgrove" is never touched.
export const HOOK_SIGNATURE = ' hook claude-code';
const OUR_HANDLER_PATTERN = /\/bitgrove"?\s+hook\s+claude-code$/;

const HOOK_TIMEOUT_SECONDS = 10;
const HOOK_TYPE_COMMAND = 'command';
const BASH_MATCHER = 'Bash';

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBitgroveHandler(handler: unknown): boolean {
  return (
    isJsonObject(handler) &&
    typeof handler.command === 'string' &&
    OUR_HANDLER_PATTERN.test(handler.command)
  );
}

function removeBitgroveHandlers(settings: JsonObject): JsonObject {
  const hooks = settings.hooks;

  if (!isJsonObject(hooks)) {
    return { ...settings };
  }

  const nextHooks: JsonObject = {};

  for (const [eventName, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) {
      nextHooks[eventName] = groups;
      continue;
    }

    let removedAny = false;
    const nextGroups: unknown[] = [];

    for (const group of groups) {
      if (!isJsonObject(group) || !Array.isArray(group.hooks)) {
        nextGroups.push(group);
        continue;
      }

      if (!group.hooks.some(isBitgroveHandler)) {
        nextGroups.push(group);
        continue;
      }

      removedAny = true;
      const remaining = group.hooks.filter(
        (handler) => !isBitgroveHandler(handler),
      );

      if (remaining.length > 0) {
        nextGroups.push({ ...group, hooks: remaining });
      }
    }

    if (nextGroups.length > 0 || !removedAny) {
      nextHooks[eventName] = nextGroups;
    }
  }

  const next: JsonObject = { ...settings };

  if (Object.keys(nextHooks).length > 0) {
    next.hooks = nextHooks;
  } else {
    delete next.hooks;
  }

  return next;
}

function commandHandler(command: string): JsonObject {
  return {
    type: HOOK_TYPE_COMMAND,
    command,
    timeout: HOOK_TIMEOUT_SECONDS,
  };
}

function appendGroup(
  hooks: JsonObject,
  eventName: string,
  group: JsonObject,
): void {
  const existing = hooks[eventName];
  const groups = Array.isArray(existing) ? [...existing] : [];
  groups.push(group);
  hooks[eventName] = groups;
}

export function installHooks(
  settings: Record<string, unknown>,
  command: string,
): Record<string, unknown> {
  const cleaned = removeBitgroveHandlers(settings);
  const baseHooks = isJsonObject(cleaned.hooks) ? cleaned.hooks : {};
  const hooks: JsonObject = { ...baseHooks };

  appendGroup(hooks, ClaudeHookEvent.SessionStart, {
    hooks: [commandHandler(command)],
  });
  appendGroup(hooks, ClaudeHookEvent.PostToolUse, {
    matcher: BASH_MATCHER,
    hooks: [commandHandler(command)],
  });
  appendGroup(hooks, ClaudeHookEvent.Stop, {
    hooks: [commandHandler(command)],
  });

  return { ...cleaned, hooks };
}

export function uninstallHooks(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  return removeBitgroveHandlers(settings);
}
