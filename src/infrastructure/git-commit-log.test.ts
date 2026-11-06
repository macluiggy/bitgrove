import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WorkKind } from '../domain';
import { GitCommitLog } from './git-commit-log';

const ME = 'me@example.com';
const TEAMMATE = 'teammate@example.com';

let repo: string;

function git(args: readonly string[], env: Record<string, string> = {}): void {
  execFileSync('git', ['-C', repo, ...args], {
    stdio: 'ignore',
    env: { ...process.env, ...env },
  });
}

function commitAs(email: string, isoDate: string, subject = 'x'): void {
  const date = `${isoDate} +0000`;
  git(['commit', '--allow-empty', '-q', '-m', subject], {
    GIT_AUTHOR_NAME: 'Someone',
    GIT_AUTHOR_EMAIL: email,
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_NAME: 'Someone',
    GIT_COMMITTER_EMAIL: email,
    GIT_COMMITTER_DATE: date,
  });
}

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'bitgrove-git-'));
  git(['init', '-q']);
  git(['config', 'user.email', ME]);
  git(['config', 'user.name', 'Me']);
  git(['config', 'commit.gpgsign', 'false']);
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('GitCommitLog', () => {
  test('returns only my commits at or after `since`, oldest first', () => {
    commitAs(ME, '2024-05-08T10:00:00');
    commitAs(ME, '2024-05-09T10:00:00');
    commitAs(TEAMMATE, '2024-05-09T11:00:00');
    commitAs(ME, '2024-05-10T09:30:00');

    const commits = new GitCommitLog().ownCommitsSince(
      repo,
      '2024-05-09T10:00:00.000Z',
    );

    expect(commits.map((commit) => commit.instant)).toEqual([
      '2024-05-09T10:00:00.000Z',
      '2024-05-10T09:30:00.000Z',
    ]);
  });

  test('includes my commits on other local branches', () => {
    commitAs(ME, '2024-05-09T10:00:00');
    git(['checkout', '-q', '-b', 'feature']);
    commitAs(ME, '2024-05-10T10:00:00');
    git(['checkout', '-q', '-']);

    const commits = new GitCommitLog().ownCommitsSince(
      repo,
      '2024-05-01T00:00:00.000Z',
    );

    expect(commits).toHaveLength(2);
  });

  test('returns an empty list outside a git repo', () => {
    const notRepo = mkdtempSync(path.join(tmpdir(), 'bitgrove-norepo-'));

    try {
      expect(
        new GitCommitLog().ownCommitsSince(notRepo, '2024-05-01T00:00:00.000Z'),
      ).toEqual([]);
    } finally {
      rmSync(notRepo, { recursive: true, force: true });
    }
  });

  test('returns an empty list for a repo with no commits', () => {
    expect(
      new GitCommitLog().ownCommitsSince(repo, '2024-05-01T00:00:00.000Z'),
    ).toEqual([]);
  });

  test('reads the kind of work from the conventional commit type, and keeps nothing else', () => {
    commitAs(ME, '2024-05-09T10:00:00', 'fix(api): secret customer detail');
    commitAs(ME, '2024-05-09T11:00:00', 'test: cover the forest');

    const commits = new GitCommitLog().ownCommitsSince(
      repo,
      '2024-05-01T00:00:00.000Z',
    );

    expect(commits.map((commit) => commit.work)).toEqual([
      WorkKind.Fix,
      WorkKind.Tests,
    ]);
    expect(JSON.stringify(commits)).not.toContain('secret');
  });
});
