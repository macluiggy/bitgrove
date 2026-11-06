import { execFileSync } from 'node:child_process';
import type { CommitLog, CommitRecord } from '../application';
import { workKindOfCommitSubject } from '../domain';
import { localTimeOf } from './system-clock';

const GIT_TIMEOUT_MS = 2000;
const MS_PER_SECOND = 1000;
const UNIX_SECONDS_PATTERN = /^\d+$/;
const FIELD_SEPARATOR = '\t';

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
 * of every local branch. From each subject it keeps only the conventional
 * commit type (feat, fix…); the message itself is never stored.
 */
export class GitCommitLog implements CommitLog {
  ownCommitsSince(projectDir: string, since: string): CommitRecord[] {
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
        '--format=%ct%x09%s',
        '--reverse',
      ]);

      const commits: CommitRecord[] = [];

      for (const line of output.split('\n')) {
        const separator = line.indexOf(FIELD_SEPARATOR);
        const time = separator === -1 ? line.trim() : line.slice(0, separator);
        const subject = separator === -1 ? '' : line.slice(separator + 1);

        if (!UNIX_SECONDS_PATTERN.test(time)) {
          continue;
        }

        const seconds = Number(time);
        if (seconds < sinceSeconds) {
          continue;
        }

        commits.push({
          ...localTimeOf(new Date(seconds * MS_PER_SECOND)),
          work: workKindOfCommitSubject(subject),
        });
      }

      return commits;
    } catch {
      return [];
    }
  }
}
