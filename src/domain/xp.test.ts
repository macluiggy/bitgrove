import { describe, expect, test } from 'bun:test';
import { EVENT_SCHEMA_VERSION, EventType, type GroveEvent } from './event';
import { DEFAULT_RULES } from './rules';
import { WorkKind } from './work';
import { DAILY_XP_CAP, levelFor, XP_BY_WORK, xpLedger } from './xp';

let minute = 0;

function commit(
  work: WorkKind,
  { day = '2024-05-08', hour = 12, project = 'api' } = {},
): GroveEvent {
  minute += 1;
  return {
    v: EVENT_SCHEMA_VERSION,
    type: EventType.CommitMade,
    at: `${day}T${String(hour).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00.000Z`,
    day,
    hour,
    project,
    agent: 'claude-code',
    work,
  };
}

function testsPassed(project = 'api', day = '2024-05-08'): GroveEvent {
  minute += 1;
  return {
    v: EVENT_SCHEMA_VERSION,
    type: EventType.TestsPassed,
    at: `${day}T13:${String(minute % 60).padStart(2, '0')}:00.000Z`,
    day,
    hour: 13,
    project,
    agent: 'claude-code',
  };
}

describe('xpLedger', () => {
  test('each finished task earns XP by its kind', () => {
    const ledger = xpLedger(
      [commit(WorkKind.Feature), commit(WorkKind.Fix)],
      DEFAULT_RULES,
    );

    expect(ledger.totalXp).toBe(
      XP_BY_WORK[WorkKind.Feature] + XP_BY_WORK[WorkKind.Fix],
    );
    expect(ledger.byProject.get('api')).toBe(ledger.totalXp);
  });

  test('running the tests again the same day earns nothing more', () => {
    const ledger = xpLedger(
      [testsPassed(), testsPassed(), testsPassed()],
      DEFAULT_RULES,
    );

    expect(ledger.totalXp).toBe(XP_BY_WORK[WorkKind.Tests]);
  });

  test('a day never earns more than the daily cap, across all projects', () => {
    const busyDay = Array.from({ length: 20 }, (_, index) =>
      commit(WorkKind.Feature, { project: index % 2 === 0 ? 'api' : 'web' }),
    );

    const ledger = xpLedger(busyDay, DEFAULT_RULES);

    expect(ledger.totalXp).toBe(DAILY_XP_CAP);
    expect(ledger.byDay.get('2024-05-08')).toBe(DAILY_XP_CAP);
  });

  test('a new day starts fresh', () => {
    const ledger = xpLedger(
      [
        ...Array.from({ length: 10 }, () => commit(WorkKind.Feature)),
        commit(WorkKind.Feature, { day: '2024-05-09' }),
      ],
      DEFAULT_RULES,
    );

    expect(ledger.byDay.get('2024-05-09')).toBe(XP_BY_WORK[WorkKind.Feature]);
  });

  test('work after hours earns no XP', () => {
    expect(
      xpLedger([commit(WorkKind.Feature, { hour: 22 })], DEFAULT_RULES).totalXp,
    ).toBe(0);
  });
});

describe('levelFor', () => {
  test('levels need a little more XP each time', () => {
    expect(levelFor(0)).toEqual({ level: 1, levelXp: 0, nextLevelXp: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toEqual({ level: 2, levelXp: 0, nextLevelXp: 200 });
    expect(levelFor(299)).toEqual({ level: 2, levelXp: 199, nextLevelXp: 200 });
    expect(levelFor(300).level).toBe(3);
  });
});
