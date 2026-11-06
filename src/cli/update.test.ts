import { describe, expect, test } from 'bun:test';
import { runUpdate, type UpdateDeps } from './update';

interface FakeUpdate {
  deps: UpdateDeps;
  lines: string[];
  downloaded: string[];
  initRuns: string[];
}

function fakeUpdate(
  currentVersion: string,
  latest: string | Error,
  initExitCode = 0,
): FakeUpdate {
  const lines: string[] = [];
  const downloaded: string[] = [];
  const initRuns: string[] = [];

  return {
    lines,
    downloaded,
    initRuns,
    deps: {
      currentVersion,
      latestTag: async () => {
        if (latest instanceof Error) {
          throw latest;
        }
        return latest;
      },
      downloadBundle: async (tag) => {
        downloaded.push(tag);
        return `/tmp/bitgrove-${tag}.mjs`;
      },
      runInit: (bundlePath) => {
        initRuns.push(bundlePath);
        return initExitCode;
      },
      write: (line) => lines.push(line),
    },
  };
}

describe('runUpdate', () => {
  test('does nothing when the latest release is already installed', async () => {
    const update = fakeUpdate('0.2.1', 'v0.2.1');

    expect(await runUpdate(update.deps, { force: false })).toBe(0);
    expect(update.downloaded).toEqual([]);
    expect(update.initRuns).toEqual([]);
    expect(update.lines.join('\n')).toContain('already up to date (v0.2.1)');
  });

  test('installs the latest release and keeps the grove', async () => {
    const update = fakeUpdate('0.2.1', 'v0.3.0');

    expect(await runUpdate(update.deps, { force: false })).toBe(0);
    expect(update.downloaded).toEqual(['v0.3.0']);
    expect(update.initRuns).toEqual(['/tmp/bitgrove-v0.3.0.mjs']);
    expect(update.lines.join('\n')).toContain('Updated v0.2.1 → v0.3.0');
  });

  test('--force reinstalls the same version', async () => {
    const update = fakeUpdate('0.2.1', 'v0.2.1');

    expect(await runUpdate(update.deps, { force: true })).toBe(0);
    expect(update.downloaded).toEqual(['v0.2.1']);
  });

  test('fails without touching the install when the latest release is unknown', async () => {
    const update = fakeUpdate('0.2.1', new Error('offline'));

    expect(await runUpdate(update.deps, { force: false })).toBe(1);
    expect(update.initRuns).toEqual([]);
    expect(update.lines.join('\n')).toContain('offline');
  });

  test('reports a failed install', async () => {
    const update = fakeUpdate('0.2.1', 'v0.3.0', 1);

    expect(await runUpdate(update.deps, { force: false })).toBe(1);
  });
});
