import type { GroveEvent, GroveRules, WorkKind } from '../domain';

export interface EventStore {
  readAll(): GroveEvent[];
  append(event: GroveEvent): void;
}

export interface RulesStore {
  load(): GroveRules;
  save(rules: GroveRules): void;
}

export interface LocalNow {
  instant: string;
  localDate: string;
  localHour: number;
}

export interface Clock {
  now(): LocalNow;
}

/** One of your commits: when it landed and what kind of work it was. */
export interface CommitRecord extends LocalNow {
  work: WorkKind;
}

export interface CommitLog {
  /**
   * Your own commits (matching the repo's git user.email) in `projectDir`
   * with a commit time at or after `since` (an ISO instant), oldest first.
   * Returns an empty list when the folder is not a git repo or git fails.
   */
  ownCommitsSince(projectDir: string, since: string): CommitRecord[];
}

export interface Activity {
  project: string;
  agent: string;
}

export interface Deps {
  events: EventStore;
  rules: RulesStore;
  clock: Clock;
  commits: CommitLog;
}
