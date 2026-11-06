import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '../..');
const DIST_ENTRY = path.join(REPO_ROOT, 'dist', 'bitgrove.mjs');
const BITGROVE_HANDLER_EVENTS = ['SessionStart', 'PostToolUse', 'Stop'];

type JsonObject = Record<string, unknown>;

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cliEnvironment(
  home: string,
  overrides: Record<string, string> = {},
): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'BITGROVE_HOME') {
      env[key] = value;
    }
  }

  env.HOME = home;
  return { ...env, ...overrides };
}

function toResult(result: ReturnType<typeof spawnSync>): CliResult {
  return {
    status: result.status,
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
  };
}

function runNode(
  home: string,
  args: readonly string[],
  input?: string,
  overrides: Record<string, string> = {},
): CliResult {
  return toResult(
    spawnSync('node', [DIST_ENTRY, ...args], {
      env: cliEnvironment(home, overrides),
      encoding: 'utf8',
      input,
    }),
  );
}

function runLauncher(
  home: string,
  args: readonly string[],
  input?: string,
): CliResult {
  const launcher = path.join(home, '.bitgrove', 'bin', 'bitgrove');

  return toResult(
    spawnSync('sh', [launcher, ...args], {
      env: cliEnvironment(home),
      encoding: 'utf8',
      input,
    }),
  );
}

function commandShim(home: string): string {
  return path.join(home, '.local', 'bin', 'bitgrove');
}

function pathWithUserBin(home: string): string {
  return `${path.join(home, '.local', 'bin')}:${process.env.PATH ?? ''}`;
}

function settingsFile(home: string): string {
  return path.join(home, '.claude', 'settings.json');
}

function readSettings(home: string): JsonObject {
  const parsed: unknown = JSON.parse(readFileSync(settingsFile(home), 'utf8'));

  if (!isJsonObject(parsed)) {
    throw new Error('settings.json is not a JSON object');
  }

  return parsed;
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
  return BITGROVE_HANDLER_EVENTS.flatMap((event) =>
    commandsOf(settings, event).filter((command) =>
      command.includes('bitgrove'),
    ),
  );
}

function writeForeignSettings(home: string): void {
  const claudeDir = path.join(home, '.claude');
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(
    settingsFile(home),
    `${JSON.stringify(
      {
        theme: 'dark',
        hooks: {
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'echo foreign' }],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
}

function readEventLines(home: string): JsonObject[] {
  const contents = readFileSync(
    path.join(home, '.bitgrove', 'events.jsonl'),
    'utf8',
  );

  return contents
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const parsed: unknown = JSON.parse(line);
      if (!isJsonObject(parsed)) {
        throw new Error('event line is not a JSON object');
      }
      return parsed;
    });
}

const TESTS_PASSED_PAYLOAD = JSON.stringify({
  session_id: 'session-1',
  transcript_path: '/tmp/transcript.jsonl',
  cwd: '/x/my-api',
  hook_event_name: 'PostToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'bun run test:unit' },
  tool_response: {
    stdout: ' 12 pass\n 0 fail\n',
    stderr: '',
    interrupted: false,
    isImage: false,
  },
});

function hookPayload(cwd: string, event: string): string {
  return JSON.stringify({
    cwd,
    hook_event_name: event,
    stop_hook_active: false,
  });
}

function gitIn(repo: string, args: readonly string[]): void {
  spawnSync('git', ['-C', repo, ...args], { stdio: 'ignore' });
}

let home: string;

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), 'bitgrove-e2e-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe('bitgrove init', () => {
  test('installs the launcher and three Claude Code handlers', () => {
    const result = runNode(home, ['init']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Bitgrove is planted.');

    const launcher = path.join(home, '.bitgrove', 'bin', 'bitgrove');
    expect(existsSync(launcher)).toBe(true);
    expect(statSync(launcher).mode & 0o111).not.toBe(0);
    expect(
      existsSync(path.join(home, '.bitgrove', 'bin', 'bitgrove.mjs')),
    ).toBe(true);

    const settings = readSettings(home);

    for (const event of BITGROVE_HANDLER_EVENTS) {
      expect(
        commandsOf(settings, event).filter((command) =>
          command.includes('bitgrove'),
        ),
      ).toHaveLength(1);
    }
  });

  test('preserves unrelated settings and foreign hooks, with a backup', () => {
    writeForeignSettings(home);

    const result = runNode(home, ['init']);

    expect(result.status).toBe(0);

    const settings = readSettings(home);
    expect(settings.theme).toBe('dark');
    expect(commandsOf(settings, 'PostToolUse')).toContain('echo foreign');
    expect(bitgroveCommands(settings)).toHaveLength(3);

    const backups = readdirSync(path.join(home, '.claude')).filter((name) =>
      name.startsWith('settings.json.bitgrove-backup-'),
    );
    expect(backups).toHaveLength(1);
  });

  test('is idempotent', () => {
    expect(runNode(home, ['init']).status).toBe(0);
    expect(runNode(home, ['init']).status).toBe(0);

    const settings = readSettings(home);

    for (const event of BITGROVE_HANDLER_EVENTS) {
      expect(
        commandsOf(settings, event).filter((command) =>
          command.includes('bitgrove'),
        ),
      ).toHaveLength(1);
    }
  });
});

describe('bitgrove command on PATH', () => {
  test('init adds a bitgrove command to ~/.local/bin that shows the grove', () => {
    const result = runNode(home, ['init'], undefined, {
      PATH: pathWithUserBin(home),
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('See it anytime with: bitgrove');
    expect(result.stdout).not.toContain('PATH');

    const shim = commandShim(home);
    expect(statSync(shim).mode & 0o111).not.toBe(0);

    const viaShim = toResult(
      spawnSync('bitgrove', [], {
        env: cliEnvironment(home, { PATH: pathWithUserBin(home) }),
        encoding: 'utf8',
      }),
    );
    expect(viaShim.status).toBe(0);
    expect(viaShim.stdout).toContain('Your grove is empty.');
  });

  test('init explains how to add ~/.local/bin to PATH when it is missing', () => {
    const result = runNode(home, ['init']);

    expect(result.status).toBe(0);
    expect(existsSync(commandShim(home))).toBe(true);
    expect(result.stdout).toContain('export PATH="$HOME/.local/bin:$PATH"');
  });

  test('init and uninstall leave a foreign ~/.local/bin/bitgrove untouched', () => {
    mkdirSync(path.dirname(commandShim(home)), { recursive: true });
    writeFileSync(commandShim(home), '#!/bin/sh\necho mine\n');

    const init = runNode(home, ['init']);
    expect(init.status).toBe(0);
    expect(init.stdout).toContain('already exists');
    expect(readFileSync(commandShim(home), 'utf8')).toBe(
      '#!/bin/sh\necho mine\n',
    );

    expect(runNode(home, ['uninstall']).status).toBe(0);
    expect(readFileSync(commandShim(home), 'utf8')).toBe(
      '#!/bin/sh\necho mine\n',
    );
  });

  test('init is idempotent and uninstall removes the command', () => {
    expect(runNode(home, ['init']).status).toBe(0);
    expect(runNode(home, ['init']).stdout).not.toContain('already exists');
    expect(existsSync(commandShim(home))).toBe(true);

    expect(runNode(home, ['uninstall']).status).toBe(0);
    expect(existsSync(commandShim(home))).toBe(false);
  });
});

describe('bitgrove hook', () => {
  test('records a passing test run, shows the grove, and uninstalls cleanly', () => {
    writeForeignSettings(home);
    expect(runNode(home, ['init']).status).toBe(0);

    const hookResult = runLauncher(
      home,
      ['hook', 'claude-code'],
      TESTS_PASSED_PAYLOAD,
    );

    expect(hookResult.status).toBe(0);
    expect(hookResult.stdout).toBe('');

    const passed = readEventLines(home).find(
      (event) => event.type === 'tests.passed',
    );
    expect(passed).toBeDefined();
    expect(passed?.project).toBe('my-api');
    expect(passed?.agent).toBe('claude-code');

    const status = runNode(home, ['status']);
    expect(status.status).toBe(0);
    expect(status.stdout).toContain('my-api');

    const garbage = runLauncher(home, ['hook', 'claude-code'], 'not json');
    expect(garbage.status).toBe(0);
    expect(garbage.stdout).toBe('');

    const eventsPath = path.join(home, '.bitgrove', 'events.jsonl');

    const uninstall = runNode(home, ['uninstall']);
    expect(uninstall.status).toBe(0);
    expect(uninstall.stdout).toContain('Your grove is still saved in');

    const settings = readSettings(home);
    expect(settings.theme).toBe('dark');
    expect(commandsOf(settings, 'PostToolUse')).toContain('echo foreign');
    expect(bitgroveCommands(settings)).toEqual([]);

    expect(existsSync(eventsPath)).toBe(true);
    expect(existsSync(path.join(home, '.bitgrove', 'bin'))).toBe(false);
  });
});

describe('bitgrove commits from git', () => {
  test('a commit made outside the agent grows the project tree', () => {
    const repo = path.join(home, 'my-api');
    mkdirSync(repo);
    gitIn(repo, ['init', '-q']);
    gitIn(repo, ['config', 'user.email', 'me@example.com']);
    gitIn(repo, ['config', 'user.name', 'Me']);
    gitIn(repo, ['config', 'commit.gpgsign', 'false']);

    expect(runNode(home, ['init']).status).toBe(0);
    expect(
      runLauncher(
        home,
        ['hook', 'claude-code'],
        hookPayload(repo, 'SessionStart'),
      ).status,
    ).toBe(0);

    // A commit made by hand, one minute after Bitgrove first saw the project.
    const later = `${Math.floor(Date.now() / 1000) + 60} +0000`;
    spawnSync('git', ['-C', repo, 'commit', '--allow-empty', '-q', '-m', 'x'], {
      stdio: 'ignore',
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: later,
        GIT_COMMITTER_DATE: later,
      },
    });

    expect(
      runLauncher(home, ['hook', 'claude-code'], hookPayload(repo, 'Stop'))
        .status,
    ).toBe(0);

    const commits = readEventLines(home).filter(
      (event) => event.type === 'commit.made',
    );
    expect(commits).toHaveLength(1);
    expect(commits[0]?.project).toBe('my-api');

    runLauncher(home, ['hook', 'claude-code'], hookPayload(repo, 'Stop'));
    expect(
      readEventLines(home).filter((event) => event.type === 'commit.made'),
    ).toHaveLength(1);
  });
});
