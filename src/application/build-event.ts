import {
  EVENT_SCHEMA_VERSION,
  type EventType,
  type GroveEvent,
  gameDayOf,
} from '../domain';
import type { Activity, Deps } from './ports';

type BuildEventDeps = Pick<Deps, 'clock' | 'rules'>;

export function buildEvent(
  deps: BuildEventDeps,
  activity: Activity,
  eventType: EventType,
): GroveEvent {
  const now = deps.clock.now();
  const rules = deps.rules.load();

  return {
    v: EVENT_SCHEMA_VERSION,
    type: eventType,
    at: now.instant,
    day: gameDayOf(now.localDate, now.localHour, rules.dayBoundaryHour),
    hour: now.localHour,
    project: activity.project,
    agent: activity.agent,
  };
}
