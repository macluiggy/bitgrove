import { spawn } from 'node:child_process';
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
import webPageBundle from '../../dist/web/index.html' with { type: 'text' };
import packageJson from '../../package.json' with { type: 'json' };
import { AGENTS, getAgent } from '../agents';
import { getWorld } from '../application';
import { DEFAULT_RULES } from '../domain';
import { renderWorld } from '../presentation';
import {
  installCommandShim,
  PATH_HINT,
  removeCommandShim,
  type ShimInstall,
  ShimOutcome,
} from './command-shim';
import { composeDeps } from './compose';
import {
  downloadReleaseBundle,
  latestReleaseTag,
  runBundleInit,
} from './github-releases';
import { hookCommand, LAUNCHER_SCRIPT } from './launcher';
import { runUpdate } from './update';
import { renderViewPage } from './view-page';

type Env = Record<string, string | undefined>;

const CLAUDE_AGENT_ID = 'claude-code';
const BUNDLE_EXTENSION = '.mjs';
const LAUNCHER_MODE = 0o755;
const STRIPPED_STAMP_CHARS = /[:.]/g;
const STAMP_SEPARATOR = '-';

const BUILD_HINT =
  'Run "bun run build" first, then "node dist/bitgrove.mjs init".';

const VERSION = packageJson.version;

const USAGE = `Bitgrove ${VERSION} — a grove that grows from what you tend.

Usage: bitgrove [command]

See your grove
  status             Show your grove in the terminal (default).
  view               Open your grove in the browser, with themes.
                     --no-open  only write the page, print its path.

Keep Bitgrove current
  update             Install the latest release; your grove is kept.
  upgrade            Same as update.
                     --force    reinstall even if already up to date.
  version            Show the installed version (also --version, -v).

Setup
  init               Install Bitgrove's Claude Code hooks.
  uninstall          Remove the hooks and the bitgrove command; keeps your grove.

  help               Show this help (also --help, -h).

Your grove is saved in ~/.bitgrove. More: https://github.com/macluiggy/bitgrove
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

// `with { type: 'text' }` makes Bun inline the built page as a string; Bun's
// types still describe `.html` imports as HTML bundles, hence the cast.
const webPage = webPageBundle as unknown as string;

const VIEW_FILE = 'view.html';
const NO_OPEN_FLAG = '--no-open';

const BROWSER_OPENERS: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'open',
  linux: 'xdg-open',
  freebsd: 'xdg-open',
  openbsd: 'xdg-open',
};

function openInBrowser(file: string): boolean {
  const opener = BROWSER_OPENERS[process.platform];

  if (opener === undefined) {
    return false;
  }

  try {
    const child = spawn(opener, [file], { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function viewCommand(args: readonly string[], env: Env): number {
  try {
    const { deps, paths } = composeDeps(env);
    const html = renderViewPage(webPage, {
      events: deps.events.readAll(),
      rules: deps.rules.load(),
      generatedAt: deps.clock.now().instant,
    });

    mkdirSync(paths.home, { recursive: true });
    const pagePath = join(paths.home, VIEW_FILE);
    writeFileSync(pagePath, html);

    const lines = [`🌳 Your grove: ${pagePath}`];

    if (!args.includes(NO_OPEN_FLAG) && openInBrowser(pagePath)) {
      lines.push('Opening it in your browser…');
    }

    process.stdout.write(`${lines.join('\n')}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    return 1;
  }
}

function statusCommand(env: Env): number {
  try {
    const { deps } = composeDeps(env);
    process.stdout.write(`${renderWorld(getWorld(deps))}\n`);
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

const FORCE_FLAG = '--force';

function updateCommand(args: readonly string[], env: Env): Promise<number> {
  return runUpdate(
    {
      currentVersion: VERSION,
      latestTag: latestReleaseTag,
      downloadBundle: downloadReleaseBundle,
      runInit: (bundlePath) => runBundleInit(bundlePath, env),
      write: (line) => process.stdout.write(`${line}\n`),
    },
    { force: args.includes(FORCE_FLAG) },
  );
}

export function run(
  args: readonly string[],
  env: Env,
): number | Promise<number> {
  switch (args[0]) {
    case undefined:
    case 'status':
      return statusCommand(env);
    case 'init':
      return initCommand(env);
    case 'view':
      return viewCommand(args.slice(1), env);
    case 'uninstall':
      return uninstallCommand(env);
    case 'update':
    case 'upgrade':
      return updateCommand(args.slice(1), env);
    case 'version':
    case '--version':
    case '-v':
      process.stdout.write(`bitgrove ${VERSION}\n`);
      return 0;
    case 'hook':
      return hookCommandRun(args[1], env);
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(USAGE);
      return 0;
    default:
      process.stderr.write(`Unknown command: ${args[0]}\n\n${USAGE}`);
      return 1;
  }
}

Promise.resolve(run(process.argv.slice(2), process.env)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  },
);
