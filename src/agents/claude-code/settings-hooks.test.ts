import { describe, expect, test } from 'bun:test';
import { HOOK_SIGNATURE, installHooks, uninstallHooks } from './settings-hooks';

const COMMAND = '"$HOME/.bitgrove/bin/bitgrove" hook claude-code';

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function groupsOf(settings: JsonObject, event: string): unknown[] {
  const hooks = settings.hooks;

  if (!isJsonObject(hooks)) {
    return [];
  }

  const groups = hooks[event];
  return Array.isArray(groups) ? groups : [];
}

function commandsOf(settings: JsonObject, event: string): string[] {
  const commands: string[] = [];

  for (const group of groupsOf(settings, event)) {
    if (!isJsonObject(group) || !Array.isArray(group.hooks)) {
      continue;
    }

    for (const handler of group.hooks) {
      if (isJsonObject(handler) && typeof handler.command === 'string') {
        commands.push(handler.command);
      }
    }
  }

  return commands;
}

function bitgroveCommands(settings: JsonObject): string[] {
  return ['SessionStart', 'PostToolUse', 'Stop'].flatMap((event) =>
    commandsOf(settings, event).filter((command) =>
      command.endsWith(HOOK_SIGNATURE),
    ),
  );
}

describe('installHooks', () => {
  test('adds one Bitgrove handler group per Claude Code event', () => {
    const settings = installHooks({}, COMMAND);

    expect(commandsOf(settings, 'SessionStart')).toEqual([COMMAND]);
    expect(commandsOf(settings, 'PostToolUse')).toEqual([COMMAND]);
    expect(commandsOf(settings, 'Stop')).toEqual([COMMAND]);

    const postGroup = groupsOf(settings, 'PostToolUse')[0];
    expect(postGroup).toEqual({
      matcher: 'Bash',
      hooks: [{ type: 'command', command: COMMAND, timeout: 10 }],
    });

    const sessionGroup = groupsOf(settings, 'SessionStart')[0];
    expect(sessionGroup).toEqual({
      hooks: [{ type: 'command', command: COMMAND, timeout: 10 }],
    });
  });

  test('preserves unrelated settings and foreign hooks in the same events', () => {
    const foreign = {
      matcher: 'Bash',
      hooks: [{ type: 'command', command: 'echo foreign' }],
    };
    const settings: JsonObject = {
      theme: 'dark',
      permissions: { allow: ['Bash'] },
      hooks: {
        PostToolUse: [foreign],
        Notification: [{ hooks: [{ type: 'command', command: 'say hi' }] }],
      },
    };
    const before = JSON.stringify(settings);

    const result = installHooks(settings, COMMAND);

    expect(result).not.toBe(settings);
    expect(JSON.stringify(settings)).toBe(before);
    expect(result.theme).toBe('dark');
    expect(result.permissions).toEqual({ allow: ['Bash'] });
    expect(commandsOf(result, 'PostToolUse')).toEqual([
      'echo foreign',
      COMMAND,
    ]);
    expect(commandsOf(result, 'Notification')).toEqual(['say hi']);
  });

  test('is idempotent', () => {
    const foreign = {
      hooks: [{ type: 'command', command: 'echo foreign' }],
    };
    const settings: JsonObject = {
      theme: 'light',
      hooks: { Stop: [foreign] },
    };

    const once = installHooks(settings, COMMAND);
    const twice = installHooks(once, COMMAND);

    expect(twice).toEqual(once);
    expect(bitgroveCommands(twice)).toHaveLength(3);
    expect(commandsOf(twice, 'Stop')).toEqual(['echo foreign', COMMAND]);
  });

  test('replaces handlers from an earlier Bitgrove command', () => {
    const old = installHooks({}, '/old/path/bitgrove hook claude-code');
    const updated = installHooks(old, COMMAND);

    expect(bitgroveCommands(updated)).toEqual([COMMAND, COMMAND, COMMAND]);
  });
});

describe('uninstallHooks', () => {
  test('removes only Bitgrove handlers and cleans empty containers', () => {
    const foreign = {
      hooks: [{ type: 'command', command: 'echo foreign' }],
    };
    const mixed = {
      matcher: 'Bash',
      hooks: [
        { type: 'command', command: 'echo foreign' },
        { type: 'command', command: COMMAND },
      ],
    };
    const settings: JsonObject = {
      theme: 'dark',
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: COMMAND }] }],
        PostToolUse: [mixed],
        Stop: [foreign],
      },
    };

    const result = uninstallHooks(settings);

    expect(result.theme).toBe('dark');
    expect(groupsOf(result, 'SessionStart')).toEqual([]);
    expect(commandsOf(result, 'PostToolUse')).toEqual(['echo foreign']);
    expect(commandsOf(result, 'Stop')).toEqual(['echo foreign']);

    const hooks = result.hooks;
    expect(isJsonObject(hooks)).toBe(true);
    expect(
      isJsonObject(hooks) ? hooks.SessionStart : undefined,
    ).toBeUndefined();
  });

  test('drops the hooks key when only Bitgrove handlers existed', () => {
    const result = uninstallHooks(installHooks({}, COMMAND));

    expect(result).toEqual({});
    expect(result.hooks).toBeUndefined();
  });

  test('is a no-op when there are no hooks', () => {
    const settings: JsonObject = { theme: 'dark' };

    expect(uninstallHooks(settings)).toEqual({ theme: 'dark' });
    expect(uninstallHooks({})).toEqual({});
  });
});

describe('hook ownership', () => {
  const foreign = {
    type: 'command',
    command: '~/projects/bitgrove/scripts/lint.sh',
  };
  const withForeign: JsonObject = {
    hooks: { PostToolUse: [{ matcher: 'Bash', hooks: [foreign] }] },
  };

  test('keeps a foreign hook whose path mentions bitgrove on install', () => {
    const installed = installHooks(withForeign, COMMAND);
    expect(commandsOf(installed, 'PostToolUse')).toContain(foreign.command);
  });

  test('keeps a foreign hook whose path mentions bitgrove on uninstall', () => {
    expect(uninstallHooks(withForeign)).toEqual(withForeign);
  });

  test('treats an absolute-path Bitgrove launcher as ours', () => {
    const settings: JsonObject = {
      hooks: {
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                command: '"/opt/x/bin/bitgrove" hook claude-code',
              },
            ],
          },
        ],
      },
    };
    expect(uninstallHooks(settings)).toEqual({});
  });
});
