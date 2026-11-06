import type { EventType, GroveEvent } from '../domain';
import { buildEvent } from './build-event';
import type { Activity, Deps } from './ports';

export type AccomplishmentType =
  | typeof EventType.TestsPassed
  | typeof EventType.CommitMade;

export function recordAccomplishment(
  deps: Deps,
  activity: Activity,
  type: AccomplishmentType,
): GroveEvent {
  const event = buildEvent(deps, activity, type);
  deps.events.append(event);
  return event;
}
