import { describe, expect, test } from 'bun:test';
import {
  EVENT_SCHEMA_VERSION,
  EventType,
  type GroveEvent,
} from '../../../src/domain';
import { eventDays, eventsUntil } from './time-travel';

function event(day: string, project = 'api'): GroveEvent {
  return {
    v: EVENT_SCHEMA_VERSION,
    type: EventType.TestsPassed,
    at: `${day}T12:00:00.000Z`,
    day,
    hour: 12,
    project,
    agent: 'claude-code',
  };
}

describe('time travel', () => {
  test('lists each day with events once, oldest first', () => {
    expect(
      eventDays([
        event('2024-01-03'),
        event('2024-01-01'),
        event('2024-01-03', 'web'),
      ]),
    ).toEqual(['2024-01-01', '2024-01-03']);
  });

  test('keeps only the events up to and including a day', () => {
    const events = [
      event('2024-01-01'),
      event('2024-01-02'),
      event('2024-01-03'),
    ];

    expect(eventsUntil(events, '2024-01-02').map((e) => e.day)).toEqual([
      '2024-01-01',
      '2024-01-02',
    ]);
  });

  test('no day selected means the whole history', () => {
    const events = [event('2024-01-01'), event('2024-01-02')];

    expect(eventsUntil(events, undefined)).toEqual(events);
  });
});
