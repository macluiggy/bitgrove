import {
  EventType,
  gameDayOf,
  growthOn,
  lastActiveDayBefore,
  shouldShowOvernight,
  type TreeGrowth,
} from '../domain';
import { buildEvent } from './build-event';
import type { Activity, Deps } from './ports';

export interface OvernightReport {
  day: string;
  growth: TreeGrowth[];
}

export function startSession(
  deps: Deps,
  activity: Activity,
): OvernightReport | undefined {
  const now = deps.clock.now();
  const rules = deps.rules.load();
  const events = deps.events.readAll();
  const today = gameDayOf(now.localDate, now.localHour, rules.dayBoundaryHour);

  let report: OvernightReport | undefined;

  if (shouldShowOvernight(events, today, rules)) {
    const day = lastActiveDayBefore(events, today);

    if (day !== undefined) {
      report = { day, growth: growthOn(events, day, rules) };
      deps.events.append(buildEvent(deps, activity, EventType.OvernightShown));
    }
  }

  deps.events.append(buildEvent(deps, activity, EventType.SessionStarted));

  return report;
}
