export interface UpdateDeps {
  currentVersion: string;
  latestTag(): Promise<string>;
  /** Downloads the release bundle for `tag` and returns its local path. */
  downloadBundle(tag: string): Promise<string>;
  /** Runs `init` with the downloaded bundle; returns its exit code. */
  runInit(bundlePath: string): number;
  write(line: string): void;
}

export interface UpdateOptions {
  force: boolean;
}

const TAG_PREFIX = 'v';

function asTag(version: string): string {
  return version.startsWith(TAG_PREFIX) ? version : `${TAG_PREFIX}${version}`;
}

/**
 * Installs the latest release over the current one. `init` is idempotent and
 * never touches the save in ~/.bitgrove, so the grove is kept.
 */
export async function runUpdate(
  deps: UpdateDeps,
  options: UpdateOptions,
): Promise<number> {
  const current = asTag(deps.currentVersion);

  let latest: string;
  try {
    latest = asTag(await deps.latestTag());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    deps.write(`Could not check for updates: ${reason}`);
    return 1;
  }

  if (latest === current && !options.force) {
    deps.write(`Bitgrove is already up to date (${current}).`);
    return 0;
  }

  deps.write(`Updating Bitgrove ${current} → ${latest}…`);

  let bundlePath: string;
  try {
    bundlePath = await deps.downloadBundle(latest);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    deps.write(`Could not download ${latest}: ${reason}`);
    return 1;
  }

  if (deps.runInit(bundlePath) !== 0) {
    deps.write(
      `Installing ${latest} failed. Your current version is unchanged.`,
    );
    return 1;
  }

  deps.write(`Updated ${current} → ${latest}. Your grove is kept.`);
  return 0;
}
