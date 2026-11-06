import { execFileSync } from 'node:child_process';
import type { CommitLog, LocalNow } from '../application';
import { localTimeOf } from './system-clock';

const GIT_TIMEOUT_MS = 2000;
const MS_PER_SECOND = 1000;
const UNIX_SECONDS_PATTERN = /^\d+$/;

function git(projectDir: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', projectDir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: GIT_TIMEOUT_MS,
  });
}

/**
 * Reads your own commits from git history, so commits made in a terminal or
 * an IDE count too, not only the ones an agent runs. Uses the committer time
 * of every local branch; reads only timestamps, never messages or code.
 */
export class GitCommitLog implements CommitLog {
  ownCommitsSince(projectDir: string, since: string): LocalNow[] {
    try {
      const email = git(projectDir, ['config', 'user.email']).trim();

      if (email === '') {
        return [];
      }

      const sinceMs = Date.parse(since);
      // git filters by whole seconds; compare at that granularity.
      const sinceSeconds = Math.floor(sinceMs / MS_PER_SECOND);

      const output = git(projectDir, [
        'log',
        '--branches',
        '--fixed-strings',
        `--author=<${email}>`,
        `--since=${sinceSeconds}`,
        '--format=%ct',
        '--reverse',
      ]);

      return output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => UNIX_SECONDS_PATTERN.test(line))
        .map(Number)
        .filter((seconds) => seconds >= sinceSeconds)
        .map((seconds) => localTimeOf(new Date(seconds * MS_PER_SECOND)));
    } catch {
      return [];
    }
  }
}
