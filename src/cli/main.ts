import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { AGENTS, getAgent } from '../agents';
import { getGrove } from '../application';
import { DEFAULT_RULES } from '../domain';
import { renderGrove } from '../presentation';
import {
  installCommandShim,
  PATH_HINT,
  removeCommandShim,
  type ShimInstall,
  ShimOutcome,
} from './command-shim';
import { composeDeps } from './compose';
import { hookCommand, LAUNCHER_SCRIPT } from './launcher';

type Env = Record<string, string | undefined>;

const CLAUDE_AGENT_ID = 'claude-code';
const BUNDLE_EXTENSION = '.mjs';
const LAUNCHER_MODE = 0o755;
const STRIPPED_STAMP_CHARS = /[:.]/g;
const STAMP_SEPARATOR = '-';

const BUILD_HINT =
  'Run "bun run build" first, then "node dist/bitgrove.mjs init".';

const USAGE = `Usage: bitgrove <command>

Commands:
  init       Install Bitgrove hooks for Claude Code.
  status     Show your grove (default).
  uninstall  Remove Bitgrove hooks and its launcher.
  help       Show this help.
`;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function timestampStamp(): string {
  return new Date()
    .toISOString()
    .replace(STRIPPED_STAMP_CHARS, STAMP_SEPARATOR);
}

function requireHome(env: Env, action: string): string {
  const home = env.HOME;

  if (home === undefined || home === '') {
    throw new Error(`Cannot ${action}: HOME is not set.`);
  }

  return home;
}

function commandLines(shim: ShimInstall, launcherPath: string): string[] {
  if (shim.outcome === ShimOutcome.ForeignFileExists) {
    return [
      `${shim.shimPath} already exists and was not created by Bitgrove, so it was left untouched.`,
      `See it anytime with: ${launcherPath}`,
    ];
  }

  if (shim.onPath) {
    return ['See it anytime with: bitgrove'];
  }

  return [
    `See it anytime with: ${launcherPath}`,
    `To type just "bitgrove", ${shim.shimPath} must be on your PATH.`,
    PATH_HINT,
  ];
}

function statusCommand(env: Env): number {
  try {
    const { deps } = composeDeps(env);
    process.stdout.write(`${renderGrove(getGrove(deps))}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 1;
  }
}

function initCommand(env: Env): number {
  const entryFile = process.argv[1];

  if (entryFile === undefined || !entryFile.endsWith(BUNDLE_EXTENSION)) {
    process.stdout.write(`${BUILD_HINT}\n`);
    return 1;
  }

  try {
    const claudeHome = requireHome(env, 'install Claude Code hooks');
    const { deps, paths } = composeDeps(env);

    mkdirSync(paths.binDir, { recursive: true });
    copyFileSync(entryFile, join(paths.binDir, 'bitgrove.mjs'));

    const launcherPath = join(paths.binDir, 'bitgrove');
    writeFileSync(launcherPath, LAUNCHER_SCRIPT);
    chmodSync(launcherPath, LAUNCHER_MODE);

    if (!existsSync(paths.configFile)) {
      deps.rules.save(DEFAULT_RULES);
    }

    const { backupPath } = AGENTS[CLAUDE_AGENT_ID].install(
      claudeHome,
      hookCommand(paths, env),
      timestampStamp(),
    );

    const shim = installCommandShim(claudeHome, launcherPath, env.PATH);

    const lines = [
      '🌱 Bitgrove is planted.',
      'Keep working with Claude Code as usual — your grove grows on its own.',
      ...commandLines(shim, launcherPath),
    ];

    if (backupPath !== undefined) {
      lines.push(`Settings backup: ${backupPath}`);
    }

    process.stdout.write(`${lines.join('\n')}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 1;
  }
}

function uninstallCommand(env: Env): number {
  try {
    const claudeHome = requireHome(env, 'remove Claude Code hooks');
    const { paths } = composeDeps(env);

    const { backupPath } = AGENTS[CLAUDE_AGENT_ID].uninstall(
      claudeHome,
      timestampStamp(),
    );

    removeCommandShim(claudeHome);
    rmSync(paths.binDir, { recursive: true, force: true });

    const lines = [
      `Bitgrove hooks removed. Your grove is still saved in ${paths.home}.`,
    ];

    if (backupPath !== undefined) {
      lines.push(`Settings backup: ${backupPath}`);
    }

    process.stdout.write(`${lines.join('\n')}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 1;
  }
}

function hookCommandRun(agentId: string | undefined, env: Env): number {
  try {
    if (agentId === undefined) {
      return 0;
    }

    const agent = getAgent(agentId);

    if (agent === undefined) {
      return 0;
    }

    const raw: unknown = JSON.parse(readFileSync(0, 'utf8'));
    const { deps } = composeDeps(env);
    const output = agent.handleHook(raw, deps);

    if (output !== undefined) {
      process.stdout.write(`${JSON.stringify(output)}\n`);
    }

    return 0;
  } catch {
    return 0;
  }
}

export function run(args: readonly string[], env: Env): number {
  switch (args[0]) {
    case undefined:
    case 'status':
      return statusCommand(env);
    case 'init':
      return initCommand(env);
    case 'uninstall':
      return uninstallCommand(env);
    case 'hook':
      return hookCommandRun(args[1], env);
    case 'help':
    case '--help':
      process.stdout.write(USAGE);
      return 0;
    default:
      process.stderr.write(USAGE);
      return 1;
  }
}

process.exitCode = run(process.argv.slice(2), process.env);
