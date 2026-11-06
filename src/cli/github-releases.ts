import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPOSITORY = 'macluiggy/bitgrove';
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
const DOWNLOAD_BASE = `https://github.com/${REPOSITORY}/releases/download`;
const BUNDLE_ASSET = 'bitgrove.mjs';
const USER_AGENT = 'bitgrove-cli';
const REQUEST_TIMEOUT_MS = 15_000;

function request(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

export async function latestReleaseTag(): Promise<string> {
  const response = await request(LATEST_RELEASE_API);

  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status}`);
  }

  const body: unknown = await response.json();

  if (
    typeof body !== 'object' ||
    body === null ||
    !('tag_name' in body) ||
    typeof body.tag_name !== 'string'
  ) {
    throw new Error('GitHub sent an unexpected answer');
  }

  return body.tag_name;
}

export async function downloadReleaseBundle(tag: string): Promise<string> {
  const response = await request(`${DOWNLOAD_BASE}/${tag}/${BUNDLE_ASSET}`);

  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status}`);
  }

  const bundlePath = join(
    mkdtempSync(join(tmpdir(), 'bitgrove-update-')),
    BUNDLE_ASSET,
  );
  writeFileSync(bundlePath, Buffer.from(await response.arrayBuffer()));
  return bundlePath;
}

/** Runs `init` from the downloaded bundle with the same runtime (Node or Bun). */
export function runBundleInit(
  bundlePath: string,
  env: NodeJS.ProcessEnv,
): number {
  const result = spawnSync(process.execPath, [bundlePath, 'init'], {
    stdio: 'inherit',
    env,
  });

  return result.status ?? 1;
}
