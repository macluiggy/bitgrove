import { EventType, gameDayOf, shouldShowBedtime } from '../domain';
import { buildEvent } from './build-event';
import type { Activity, Deps } from './ports';

export function checkBedtime(deps: Deps, activity: Activity): boolean {
  const now = deps.clock.now();
  const rules = deps.rules.load();
  const events = deps.events.readAll();
  const today = gameDayOf(now.localDate, now.localHour, rules.dayBoundaryHour);

  if (!shouldShowBedtime(events, today, now.localHour, rules)) {
    return false;
  }

  deps.events.append(buildEvent(deps, activity, EventType.BedtimeShown));
  return true;
}
