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
  Deps,
  EventStore,
  LocalNow,
  RulesStore,
} from './ports';
import { recordAccomplishment } from './record-accomplishment';
import { startSession } from './start-session';

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
}

function createDeps(
  now: LocalNow,
  initialEvents: GroveEvent[] = [],
  rules: GroveRules = DEFAULT_RULES,
): FakeDeps {
  const events = createEventStore(initialEvents);

  return {
    deps: {
      events,
      rules: createRulesStore(rules),
      clock: createClock(now),
    },
    events,
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
