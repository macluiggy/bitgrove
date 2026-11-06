import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_RULES,
  EVENT_SCHEMA_VERSION,
  EventType,
  type EventType as EventTypeValue,
  type GroveEvent,
  type GroveRules,
  Stage,
} from '../domain';
import { checkBedtime } from './check-bedtime';
import { getGrove } from './get-grove';
import type {
  Activity,
  Clock,
  CommitLog,
  Deps,
  EventStore,
  LocalNow,
  RulesStore,
} from './ports';
import { recordAccomplishment } from './record-accomplishment';
import { startSession } from './start-session';
import { syncCommits } from './sync-commits';

interface FakeCommitLog extends CommitLog {
  readonly calls: { projectDir: string; since: string }[];
}

function createCommitLog(commits: LocalNow[] = []): FakeCommitLog {
  const calls: { projectDir: string; since: string }[] = [];

  return {
    calls,
    ownCommitsSince: (projectDir, since) => {
      calls.push({ projectDir, since });
      return commits;
    },
  };
}

interface FakeEventStore extends EventStore {
  readonly events: GroveEvent[];
}

function createEventStore(initial: GroveEvent[] = []): FakeEventStore {
  const events = [...initial];

  return {
    events,
    readAll: () => [...events],
    append: (event) => {
      events.push(event);
    },
  };
}

function createRulesStore(rules: GroveRules = DEFAULT_RULES): RulesStore {
  let current = rules;

  return {
    load: () => current,
    save: (next) => {
      current = next;
    },
  };
}

function createClock(now: LocalNow): Clock {
  return { now: () => now };
}

interface FakeDeps {
  deps: Deps;
  events: FakeEventStore;
  commits: FakeCommitLog;
}

function createDeps(
  now: LocalNow,
  initialEvents: GroveEvent[] = [],
  rules: GroveRules = DEFAULT_RULES,
  commitTimes: LocalNow[] = [],
): FakeDeps {
  const events = createEventStore(initialEvents);
  const commits = createCommitLog(commitTimes);

  return {
    deps: {
      events,
      rules: createRulesStore(rules),
      clock: createClock(now),
      commits,
    },
    events,
    commits,
  };
}

interface EventOptions {
  type: EventTypeValue;
  day: string;
  project?: string;
  hour?: number;
}

function makeEvent({
  type,
  day,
  project = 'alpha',
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

const activity: Activity = { project: 'bitgrove', agent: 'claude-code' };

const morning: LocalNow = {
  instant: '2024-05-10T10:00:00.000Z',
  localDate: '2024-05-10',
  localHour: 10,
};

describe('recordAccomplishment', () => {
  test('assigns an accomplishment before the boundary to the previous game day', () => {
    const { deps, events } = createDeps({
      instant: '2024-05-10T02:00:00.000Z',
      localDate: '2024-05-10',
      localHour: 2,
    });

    const event = recordAccomplishment(deps, activity, EventType.TestsPassed);

    expect(event).toEqual({
      v: EVENT_SCHEMA_VERSION,
      type: EventType.TestsPassed,
      at: '2024-05-10T02:00:00.000Z',
      day: '2024-05-09',
      hour: 2,
      project: 'bitgrove',
      agent: 'claude-code',
    });
    expect(events.events).toEqual([event]);
  });
});

describe('startSession', () => {
  test('reports overnight growth once per day', () => {
    const prior = makeEvent({
      type: EventType.TestsPassed,
      day: '2024-05-09',
    });
    const { deps, events } = createDeps(morning, [prior]);

    const report = startSession(deps, activity);

    expect(report).toEqual({
      day: '2024-05-09',
      growth: [
        {
          project: 'alpha',
          tendedDaysBefore: 0,
          tendedDaysAfter: 1,
          stageBefore: Stage.Seed,
          stageAfter: Stage.Sprout,
          stageChanged: true,
        },
      ],
    });
    expect(events.events.slice(1).map((event) => event.type)).toEqual([
      EventType.OvernightShown,
      EventType.SessionStarted,
    ]);

    expect(startSession(deps, activity)).toBeUndefined();
    expect(events.events.slice(3).map((event) => event.type)).toEqual([
      EventType.SessionStarted,
    ]);
  });

  test('returns undefined when there is no prior growth', () => {
    const priorNotice = makeEvent({
      type: EventType.SessionStarted,
      day: '2024-05-09',
    });
    const { deps, events } = createDeps(morning, [priorNotice]);

    expect(startSession(deps, activity)).toBeUndefined();
    expect(events.events.map((event) => event.type)).toEqual([
      EventType.SessionStarted,
      EventType.SessionStarted,
    ]);
  });
});

describe('checkBedtime', () => {
  test('shows a bedtime line once after the end hour', () => {
    const { deps, events } = createDeps({
      instant: '2024-05-10T20:00:00.000Z',
      localDate: '2024-05-10',
      localHour: 20,
    });

    expect(checkBedtime(deps, activity)).toBe(true);
    expect(events.events).toHaveLength(1);
    expect(events.events[0]?.type).toBe(EventType.BedtimeShown);

    expect(checkBedtime(deps, activity)).toBe(false);
    expect(events.events).toHaveLength(1);
  });

  test('stays quiet during work hours', () => {
    const { deps, events } = createDeps({
      instant: '2024-05-10T12:00:00.000Z',
      localDate: '2024-05-10',
      localHour: 12,
    });

    expect(checkBedtime(deps, activity)).toBe(false);
    expect(events.events).toEqual([]);
  });
});

describe('getGrove', () => {
  test('counts tended days, not accomplishments', () => {
    const { deps } = createDeps(morning, [
      makeEvent({
        type: EventType.TestsPassed,
        day: '2024-05-01',
        project: 'alpha',
      }),
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
        type: EventType.SessionStarted,
        day: '2024-05-02',
        project: 'beta',
      }),
    ]);

    const grove = getGrove(deps);

    expect(grove.totalTendedDays).toBe(2);
    expect(grove.trees).toEqual([
      { project: 'alpha', tendedDays: 2, stage: Stage.Sprout },
      { project: 'beta', tendedDays: 0, stage: Stage.Seed },
    ]);
  });
});

describe('syncCommits', () => {
  const now: LocalNow = {
    instant: '2024-05-10T15:00:00.000Z',
    localDate: '2024-05-10',
    localHour: 15,
  };
  const activity: Activity = { project: 'alpha', agent: 'claude-code' };
  const firstSeen = makeEvent({
    type: EventType.SessionStarted,
    day: '2024-05-08',
  });

  const commitAt = (
    instant: string,
    localDate: string,
    localHour: number,
  ): LocalNow => ({ instant, localDate, localHour });

  test('records nothing and skips git before Bitgrove has seen any session', () => {
    const { deps, events, commits } = createDeps(now, [], DEFAULT_RULES, [
      commitAt('2024-05-10T10:00:00.000Z', '2024-05-10', 10),
    ]);

    expect(syncCommits(deps, activity, '/work/alpha')).toBe(0);
    expect(events.events).toEqual([]);
    expect(commits.calls).toEqual([]);
  });

  test('records each own commit since the first event, on its real day and hour', () => {
    const { deps, events, commits } = createDeps(
      now,
      [firstSeen],
      DEFAULT_RULES,
      [
        commitAt('2024-05-09T10:00:00.000Z', '2024-05-09', 10),
        commitAt('2024-05-10T11:30:00.000Z', '2024-05-10', 11),
      ],
    );

    expect(syncCommits(deps, activity, '/work/alpha')).toBe(2);
    expect(commits.calls).toEqual([
      { projectDir: '/work/alpha', since: firstSeen.at },
    ]);

    const recorded = events.events.slice(1);
    expect(recorded).toEqual([
      {
        v: EVENT_SCHEMA_VERSION,
        type: EventType.CommitMade,
        at: '2024-05-09T10:00:00.000Z',
        day: '2024-05-09',
        hour: 10,
        project: 'alpha',
        agent: 'claude-code',
      },
      {
        v: EVENT_SCHEMA_VERSION,
        type: EventType.CommitMade,
        at: '2024-05-10T11:30:00.000Z',
        day: '2024-05-10',
        hour: 11,
        project: 'alpha',
        agent: 'claude-code',
      },
    ]);
  });

  test('a commit before the day boundary belongs to the previous game day', () => {
    const { deps, events } = createDeps(now, [firstSeen], DEFAULT_RULES, [
      commitAt('2024-05-10T02:00:00.000Z', '2024-05-10', 2),
    ]);

    syncCommits(deps, activity, '/work/alpha');

    expect(events.events.at(-1)?.day).toBe('2024-05-09');
    expect(events.events.at(-1)?.hour).toBe(2);
  });

  test('never records the same commit twice for a project', () => {
    const commit = commitAt('2024-05-09T10:00:00.000Z', '2024-05-09', 10);
    const { deps, events } = createDeps(now, [firstSeen], DEFAULT_RULES, [
      commit,
    ]);

    expect(syncCommits(deps, activity, '/work/alpha')).toBe(1);
    expect(syncCommits(deps, activity, '/work/alpha')).toBe(0);
    expect(
      events.events.filter((event) => event.type === EventType.CommitMade),
    ).toHaveLength(1);
  });

  test('grows the tree on the day of a commit made outside the agent', () => {
    const { deps } = createDeps(now, [firstSeen], DEFAULT_RULES, [
      commitAt('2024-05-09T10:00:00.000Z', '2024-05-09', 10),
    ]);

    syncCommits(deps, activity, '/work/alpha');

    const tree = getGrove(deps).trees.find((t) => t.project === 'alpha');
    expect(tree?.tendedDays).toBe(1);
  });
});
