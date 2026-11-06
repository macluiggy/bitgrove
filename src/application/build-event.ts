import {
  EVENT_SCHEMA_VERSION,
  type EventType,
  type GroveEvent,
  gameDayOf,
} from '../domain';
import type { Activity, Deps, LocalNow } from './ports';

type BuildEventDeps = Pick<Deps, 'clock' | 'rules'>;

export function buildEventAt(
  deps: Pick<Deps, 'rules'>,
  activity: Activity,
  eventType: EventType,
  time: LocalNow,
): GroveEvent {
  const rules = deps.rules.load();

  return {
    v: EVENT_SCHEMA_VERSION,
    type: eventType,
    at: time.instant,
    day: gameDayOf(time.localDate, time.localHour, rules.dayBoundaryHour),
    hour: time.localHour,
    project: activity.project,
    agent: activity.agent,
  };
}

export function buildEvent(
  deps: BuildEventDeps,
  activity: Activity,
  eventType: EventType,
): GroveEvent {
  return buildEventAt(deps, activity, eventType, deps.clock.now());
}
