import { describe, expect, test } from 'bun:test';
import {
  EVENT_SCHEMA_VERSION,
  EventType,
  type EventType as EventTypeValue,
  type GroveEvent,
} from './event';
import { buildGrove, growthOn, tendedDaysByProject } from './grove';
import { DEFAULT_RULES } from './rules';
import { Stage } from './stage';

interface EventOptions {
  type: EventTypeValue;
  day: string;
  project?: string;
  hour?: number;
}

function makeEvent({
  type,
  day,
  project = 'bitgrove',
  hour = 12,
}: EventOptions): GroveEvent {
  return {
    v: EVENT_SCHEMA_VERSION,
    type,
    at: `${day}T12:00:00.000Z`,
    day,
    hour,
    project,
    agent: 'claude-code',
  };
}

describe('tendedDaysByProject', () => {
  test('counts a day once regardless of volume', () => {
    const events = [
      makeEvent({ type: EventType.TestsPassed, day: '2024-05-01' }),
      makeEvent({ type: EventType.CommitMade, day: '2024-05-01' }),
      makeEvent({ type: EventType.CommitMade, day: '2024-05-01' }),
    ];

    const result = tendedDaysByProject(events, DEFAULT_RULES);

    expect(result.get('bitgrove')).toEqual(new Set(['2024-05-01']));
    expect(result.get('bitgrove')?.size).toBe(1);
  });

  test('ignores accomplishments after hours', () => {
    const events = [
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-01',
        hour: 19,
      }),
      makeEvent({
        type: EventType.TestsPassed,
        day: '2024-05-02',
        hour: 3,
      }),
    ];

    const result = tendedDaysByProject(events, DEFAULT_RULES);

    expect(result.get('bitgrove')).toEqual(new Set());
  });

  test('session and notice events never count as tended', () => {
    const events = [
      makeEvent({ type: EventType.SessionStarted, day: '2024-05-01' }),
      makeEvent({ type: EventType.OvernightShown, day: '2024-05-01' }),
      makeEvent({ type: EventType.BedtimeShown, day: '2024-05-01' }),
    ];

    const result = tendedDaysByProject(events, DEFAULT_RULES);

    expect(result.get('bitgrove')).toEqual(new Set());
  });

  test('filters days after the inclusive limit', () => {
    const events = [
      makeEvent({ type: EventType.CommitMade, day: '2024-05-01' }),
      makeEvent({ type: EventType.CommitMade, day: '2024-05-02' }),
      makeEvent({ type: EventType.CommitMade, day: '2024-05-03' }),
    ];

    const result = tendedDaysByProject(events, DEFAULT_RULES, '2024-05-02');

    expect(result.get('bitgrove')).toEqual(
      new Set(['2024-05-01', '2024-05-02']),
    );
  });
});

describe('buildGrove', () => {
  test('includes a project with only session events as a seed', () => {
    const events = [
      makeEvent({
        type: EventType.SessionStarted,
        day: '2024-05-01',
        project: 'quiet-project',
      }),
    ];

    const grove = buildGrove(events, DEFAULT_RULES);

    expect(grove.trees).toEqual([
      { project: 'quiet-project', tendedDays: 0, stage: Stage.Seed },
    ]);
    expect(grove.totalTendedDays).toBe(0);
  });

  test('ignores after-hours accomplishments for growth', () => {
    const events = [
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-01',
        hour: 19,
      }),
      makeEvent({
        type: EventType.TestsPassed,
        day: '2024-05-01',
        hour: 20,
      }),
    ];

    const grove = buildGrove(events, DEFAULT_RULES);

    expect(grove.trees[0]?.tendedDays).toBe(0);
    expect(grove.trees[0]?.stage).toBe(Stage.Seed);
  });

  test('sorts trees by tended days desc then project name asc', () => {
    const events = [
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-01',
        project: 'alpha',
      }),
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-02',
        project: 'alpha',
      }),
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-01',
        project: 'beta',
      }),
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-02',
        project: 'zeta',
      }),
      makeEvent({
        type: EventType.SessionStarted,
        day: '2024-05-01',
        project: 'gamma',
      }),
    ];

    const grove = buildGrove(events, DEFAULT_RULES);

    expect(grove.trees.map((tree) => tree.project)).toEqual([
      'alpha',
      'beta',
      'zeta',
      'gamma',
    ]);
    expect(grove.totalTendedDays).toBe(4);
  });

  test('limits growth to the inclusive day', () => {
    const events = [
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-01',
        project: 'alpha',
      }),
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-02',
        project: 'alpha',
      }),
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-03',
        project: 'alpha',
      }),
      makeEvent({
        type: EventType.CommitMade,
        day: '2024-05-03',
        project: 'future-project',
      }),
    ];

    const grove = buildGrove(events, DEFAULT_RULES, '2024-05-02');

    expect(grove.trees).toEqual([
      { project: 'alpha', tendedDays: 2, stage: Stage.Sprout },
    ]);
    expect(grove.totalTendedDays).toBe(2);
  });
});

describe('growthOn', () => {
  const events = [
    makeEvent({
      type: EventType.CommitMade,
      day: '2024-05-01',
      project: 'grove',
    }),
    makeEvent({
      type: EventType.TestsPassed,
      day: '2024-05-02',
      project: 'grove',
    }),
    makeEvent({
      type: EventType.CommitMade,
      day: '2024-05-03',
      project: 'grove',
    }),
    makeEvent({
      type: EventType.CommitMade,
      day: '2024-05-01',
      project: 'other',
    }),
  ];

  test('reports a stage change when crossing one tended day', () => {
    const growth = growthOn(events, '2024-05-01', DEFAULT_RULES);

    expect(growth).toEqual([
      {
        project: 'grove',
        tendedDaysBefore: 0,
        tendedDaysAfter: 1,
        stageBefore: Stage.Seed,
        stageAfter: Stage.Sprout,
        stageChanged: true,
      },
      {
        project: 'other',
        tendedDaysBefore: 0,
        tendedDaysAfter: 1,
        stageBefore: Stage.Seed,
        stageAfter: Stage.Sprout,
        stageChanged: true,
      },
    ]);
  });

  test('does not report a stage change within the same stage', () => {
    const growth = growthOn(events, '2024-05-02', DEFAULT_RULES);

    expect(growth).toEqual([
      {
        project: 'grove',
        tendedDaysBefore: 1,
        tendedDaysAfter: 2,
        stageBefore: Stage.Sprout,
        stageAfter: Stage.Sprout,
        stageChanged: false,
      },
    ]);
  });

  test('reports a stage change when crossing three tended days', () => {
    const growth = growthOn(events, '2024-05-03', DEFAULT_RULES);

    expect(growth).toEqual([
      {
        project: 'grove',
        tendedDaysBefore: 2,
        tendedDaysAfter: 3,
        stageBefore: Stage.Sprout,
        stageAfter: Stage.Sapling,
        stageChanged: true,
      },
    ]);
  });

  test('returns no growth for a day without accomplishments', () => {
    expect(growthOn(events, '2024-05-04', DEFAULT_RULES)).toEqual([]);
  });

  test('counts only days strictly before the reported day', () => {
    const growth = growthOn(events, '2024-05-03', DEFAULT_RULES);

    expect(growth[0]?.tendedDaysBefore).toBe(2);
  });
});
