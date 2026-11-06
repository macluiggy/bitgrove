import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_RULES,
  EVENT_SCHEMA_VERSION,
  EventType,
  type EventType as EventTypeValue,
  type GroveEvent,
  Stage,
} from '../../../src/domain';
import { toGroveView } from './grove-view';

function event(
  type: EventTypeValue,
  day: string,
  project: string,
  hour = 12,
): GroveEvent {
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

describe('toGroveView', () => {
  test('an empty save is an empty grove', () => {
    expect(toGroveView([], DEFAULT_RULES)).toEqual({
      trees: [],
      totalTendedDays: 0,
      isEmpty: true,
    });
  });

  test('describes each tree with its stage and the days left to grow', () => {
    const view = toGroveView(
      [
        event(EventType.TestsPassed, '2024-05-08', 'api'),
        event(EventType.CommitMade, '2024-05-09', 'api'),
        event(EventType.SessionStarted, '2024-05-09', 'web'),
      ],
      DEFAULT_RULES,
    );

    expect(view.isEmpty).toBe(false);
    expect(view.totalTendedDays).toBe(2);
    expect(view.trees).toEqual([
      {
        project: 'api',
        stage: Stage.Sprout,
        tendedDays: 2,
        nextStage: Stage.Sapling,
        daysToNextStage: 1,
      },
      {
        project: 'web',
        stage: Stage.Seed,
        tendedDays: 0,
        nextStage: Stage.Sprout,
        daysToNextStage: 1,
      },
    ]);
  });

  test('an ancient tree has nothing left to grow into', () => {
    const days = Array.from({ length: 30 }, (_, index) => {
      const day = new Date(Date.UTC(2024, 0, 1 + index))
        .toISOString()
        .slice(0, 10);
      return event(EventType.TestsPassed, day, 'old');
    });

    const [tree] = toGroveView(days, DEFAULT_RULES).trees;

    expect(tree?.stage).toBe(Stage.Ancient);
    expect(tree?.nextStage).toBeUndefined();
    expect(tree?.daysToNextStage).toBeUndefined();
  });

  test('work after hours does not grow anything, same as the terminal', () => {
    const view = toGroveView(
      [event(EventType.TestsPassed, '2024-05-08', 'api', 21)],
      DEFAULT_RULES,
    );

    expect(view.trees[0]?.tendedDays).toBe(0);
  });
});
