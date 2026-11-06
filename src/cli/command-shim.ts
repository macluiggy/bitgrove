import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, join } from 'node:path';

// A tiny script in ~/.local/bin so `bitgrove` works from any terminal.
// It is a script, not a symlink, because the launcher finds its bundle
// relative to its own location.
const USER_BIN_SEGMENTS = ['.local', 'bin'] as const;
const COMMAND_NAME = 'bitgrove';
const SHIM_MARKER = '# Created by bitgrove init';
const SHIM_MODE = 0o755;

export const PATH_HINT =
  'Add it to your PATH (e.g. in ~/.bashrc or ~/.zshrc): export PATH="$HOME/.local/bin:$PATH"';

export const ShimOutcome = {
  Installed: 'installed',
  ForeignFileExists: 'foreign-file-exists',
} as const;

export type ShimOutcome = (typeof ShimOutcome)[keyof typeof ShimOutcome];

export interface ShimInstall {
  outcome: ShimOutcome;
  shimPath: string;
  onPath: boolean;
}

function userBinDir(home: string): string {
  return join(home, ...USER_BIN_SEGMENTS);
}

function shimScript(launcherPath: string): string {
  return `#!/bin/sh
${SHIM_MARKER}
exec "${launcherPath}" "$@"
`;
}

function isOurShim(shimPath: string): boolean {
  try {
    return readFileSync(shimPath, 'utf8').includes(SHIM_MARKER);
  } catch {
    return false;
  }
}

function isOnPath(dir: string, pathValue: string | undefined): boolean {
  return (pathValue ?? '')
    .split(delimiter)
    .some((entry) => entry.replace(/\/+$/, '') === dir);
}

export function installCommandShim(
  home: string,
  launcherPath: string,
  pathValue: string | undefined,
): ShimInstall {
  const binDir = userBinDir(home);
  const shimPath = join(binDir, COMMAND_NAME);
  const onPath = isOnPath(binDir, pathValue);

  if (existsSync(shimPath) && !isOurShim(shimPath)) {
    return { outcome: ShimOutcome.ForeignFileExists, shimPath, onPath };
  }

  mkdirSync(binDir, { recursive: true });
  writeFileSync(shimPath, shimScript(launcherPath));
  chmodSync(shimPath, SHIM_MODE);

  return { outcome: ShimOutcome.Installed, shimPath, onPath };
}

export function removeCommandShim(home: string): void {
  const shimPath = join(userBinDir(home), COMMAND_NAME);

  if (isOurShim(shimPath)) {
    rmSync(shimPath, { force: true });
  }
}
