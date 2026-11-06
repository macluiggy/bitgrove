import { EventType, type GroveEvent } from './event';

/** What kind of work an accomplishment was: it decides how an ecosystem grows. */
export const WorkKind = {
  Feature: 'feature',
  Fix: 'fix',
  Refactor: 'refactor',
  Tests: 'tests',
  Docs: 'docs',
  Chore: 'chore',
} as const;

export type WorkKind = (typeof WorkKind)[keyof typeof WorkKind];

const WORK_KINDS: ReadonlySet<string> = new Set(Object.values(WorkKind));

export function isWorkKind(value: unknown): value is WorkKind {
  return typeof value === 'string' && WORK_KINDS.has(value);
}

// Conventional commit types (https://www.conventionalcommits.org).
const COMMIT_TYPE_WORK: Readonly<Record<string, WorkKind>> = {
  feat: WorkKind.Feature,
  feature: WorkKind.Feature,
  fix: WorkKind.Fix,
  refactor: WorkKind.Refactor,
  perf: WorkKind.Refactor,
  style: WorkKind.Refactor,
  test: WorkKind.Tests,
  tests: WorkKind.Tests,
  docs: WorkKind.Docs,
  doc: WorkKind.Docs,
  chore: WorkKind.Chore,
  build: WorkKind.Chore,
  ci: WorkKind.Chore,
  revert: WorkKind.Chore,
};

const COMMIT_TYPE_PATTERN = /^([a-z]+)(?:\([^)]*\))?!?:/i;

/**
 * The kind of work a commit subject describes, read from its conventional
 * commit type. A commit without a known type is still real work: a feature.
 */
export function workKindOfCommitSubject(subject: string): WorkKind {
  const type = COMMIT_TYPE_PATTERN.exec(subject.trim())?.[1]?.toLowerCase();
  return (
    (type === undefined ? undefined : COMMIT_TYPE_WORK[type]) ??
    WorkKind.Feature
  );
}

/** The work an event represents, or undefined when it is not an accomplishment. */
export function workOf(event: GroveEvent): WorkKind | undefined {
  if (event.type === EventType.TestsPassed) {
    return WorkKind.Tests;
  }

  if (event.type === EventType.CommitMade) {
    return event.work ?? WorkKind.Feature;
  }

  return undefined;
}
