import { describe, expect, test } from 'bun:test';
import {
  EVENT_SCHEMA_VERSION,
  EventType,
  type EventType as EventTypeValue,
  type GroveEvent,
} from './event';
import {
  lastActiveDayBefore,
  shouldShowBedtime,
  shouldShowOvernight,
} from './notices';
import { DEFAULT_RULES } from './rules';

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

describe('lastActiveDayBefore', () => {
  test('returns the most recent day before today', () => {
    const events = [
      makeEvent({ type: EventType.SessionStarted, day: '2024-05-01' }),
      makeEvent({ type: EventType.CommitMade, day: '2024-05-03' }),
      makeEvent({ type: EventType.CommitMade, day: '2024-05-02' }),
    ];

    expect(lastActiveDayBefore(events, '2024-05-04')).toBe('2024-05-03');
  });

  test('ignores events from today', () => {
    const events = [
      makeEvent({ type: EventType.CommitMade, day: '2024-05-04' }),
    ];

    expect(lastActiveDayBefore(events, '2024-05-04')).toBeUndefined();
  });

  test('returns undefined without earlier events', () => {
    expect(lastActiveDayBefore([], '2024-05-04')).toBeUndefined();
  });
});

describe('shouldShowOvernight', () => {
  test('is true when the previous active day grew and nothing was shown today', () => {
    const events = [
      makeEvent({ type: EventType.CommitMade, day: '2024-05-01' }),
    ];

    expect(shouldShowOvernight(events, '2024-05-02', DEFAULT_RULES)).toBe(true);
  });

  test('is false when the overnight report was already shown today', () => {
    const events = [
      makeEvent({ type: EventType.CommitMade, day: '2024-05-01' }),
      makeEvent({ type: EventType.OvernightShown, day: '2024-05-02' }),
    ];

    expect(shouldShowOvernight(events, '2024-05-02', DEFAULT_RULES)).toBe(
      false,
    );
  });

  test('is false when the previous active day had no growth', () => {
    const events = [
      makeEvent({ type: EventType.SessionStarted, day: '2024-05-01' }),
    ];

    expect(shouldShowOvernight(events, '2024-05-02', DEFAULT_RULES)).toBe(
      false,
    );
  });

  test('is false when there is no previous active day', () => {
    expect(shouldShowOvernight([], '2024-05-02', DEFAULT_RULES)).toBe(false);
  });

  test('is true when the previous report belongs to an older day', () => {
    const events = [
      makeEvent({ type: EventType.CommitMade, day: '2024-05-01' }),
      makeEvent({ type: EventType.OvernightShown, day: '2024-05-01' }),
    ];

    expect(shouldShowOvernight(events, '2024-05-02', DEFAULT_RULES)).toBe(true);
  });
});

describe('shouldShowBedtime', () => {
  test('is false during work hours', () => {
    expect(shouldShowBedtime([], '2024-05-01', 18, DEFAULT_RULES)).toBe(false);
    expect(shouldShowBedtime([], '2024-05-01', 4, DEFAULT_RULES)).toBe(false);
  });

  test('is true after hours when nothing was shown today', () => {
    expect(shouldShowBedtime([], '2024-05-01', 19, DEFAULT_RULES)).toBe(true);
    expect(shouldShowBedtime([], '2024-05-01', 23, DEFAULT_RULES)).toBe(true);
    expect(shouldShowBedtime([], '2024-05-01', 3, DEFAULT_RULES)).toBe(true);
  });

  test('is false once shown today', () => {
    const events = [
      makeEvent({ type: EventType.BedtimeShown, day: '2024-05-01' }),
    ];

    expect(shouldShowBedtime(events, '2024-05-01', 20, DEFAULT_RULES)).toBe(
      false,
    );
  });

  test('is true when the notice belongs to an older day', () => {
    const events = [
      makeEvent({ type: EventType.BedtimeShown, day: '2024-04-30' }),
    ];

    expect(shouldShowBedtime(events, '2024-05-01', 20, DEFAULT_RULES)).toBe(
      true,
    );
  });
});
