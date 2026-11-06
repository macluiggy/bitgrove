import { describe, expect, test } from 'bun:test';
import { EVENT_SCHEMA_VERSION, EventType, type GroveEvent } from './event';
import { WorkKind, workKindOfCommitSubject, workOf } from './work';

describe('workKindOfCommitSubject', () => {
  const cases: [string, WorkKind][] = [
    ['feat: add the forest', WorkKind.Feature],
    ['feat(web)!: new page', WorkKind.Feature],
    ['fix(cli): exit 0 on bad input', WorkKind.Fix],
    ['refactor: split the layout', WorkKind.Refactor],
    ['perf: cache the tilesheet', WorkKind.Refactor],
    ['test: cover the day boundary', WorkKind.Tests],
    ['docs: explain releases', WorkKind.Docs],
    ['chore(release): v0.2.1', WorkKind.Chore],
    ['ci: check every push', WorkKind.Chore],
    ['Add the forest', WorkKind.Feature],
    ['', WorkKind.Feature],
  ];

  for (const [subject, kind] of cases) {
    test(`"${subject}" is ${kind}`, () => {
      expect(workKindOfCommitSubject(subject)).toBe(kind);
    });
  }
});

function event(type: GroveEvent['type'], work?: WorkKind): GroveEvent {
  return {
    v: EVENT_SCHEMA_VERSION,
    type,
    at: '2024-05-08T12:00:00.000Z',
    day: '2024-05-08',
    hour: 12,
    project: 'api',
    agent: 'claude-code',
    ...(work === undefined ? {} : { work }),
  };
}

describe('workOf', () => {
  test('a passing test run is tests work', () => {
    expect(workOf(event(EventType.TestsPassed))).toBe(WorkKind.Tests);
  });

  test('a commit carries its own kind', () => {
    expect(workOf(event(EventType.CommitMade, WorkKind.Fix))).toBe(
      WorkKind.Fix,
    );
  });

  test('a commit recorded before work kinds existed counts as a feature', () => {
    expect(workOf(event(EventType.CommitMade))).toBe(WorkKind.Feature);
  });

  test('sessions and notices are not work', () => {
    expect(workOf(event(EventType.SessionStarted))).toBeUndefined();
    expect(workOf(event(EventType.BedtimeShown))).toBeUndefined();
  });
});
