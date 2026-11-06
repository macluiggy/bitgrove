import type { GroveEvent } from '../../../src/domain';

/** Every game day that has events, oldest first. */
export function eventDays(events: readonly GroveEvent[]): string[] {
  return [...new Set(events.map((event) => event.day))].sort();
}

/** The history as it was at the end of `day`; undefined means all of it. */
export function eventsUntil(
  events: readonly GroveEvent[],
  day: string | undefined,
): GroveEvent[] {
  return day === undefined
    ? [...events]
    : events.filter((event) => event.day <= day);
}
