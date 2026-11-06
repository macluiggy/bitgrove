import type { BitgrovePaths, PathEnvironment } from '../infrastructure';

export const LAUNCHER_SCRIPT = `#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)"
if command -v bun >/dev/null 2>&1; then exec bun "$DIR/bitgrove.mjs" "$@"; fi
exec node "$DIR/bitgrove.mjs" "$@"
`;

export const HOOK_COMMAND = '"$HOME/.bitgrove/bin/bitgrove" hook claude-code';

const HOOK_ARGS = 'hook claude-code';

function isSet(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

export function hookCommand(
  paths: BitgrovePaths,
  env: PathEnvironment,
): string {
  if (isSet(env.BITGROVE_HOME)) {
    return `"${paths.binDir}/bitgrove" ${HOOK_ARGS}`;
  }

  return HOOK_COMMAND;
}
