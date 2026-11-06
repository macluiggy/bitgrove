import { EventType, type GroveEvent } from './event';
import { growthOn } from './grove';
import { type GroveRules, isAfterHours } from './rules';

export function lastActiveDayBefore(
  events: readonly GroveEvent[],
  today: string,
): string | undefined {
  let lastDay: string | undefined;

  for (const event of events) {
    if (event.day >= today) {
      continue;
    }

    if (lastDay === undefined || event.day > lastDay) {
      lastDay = event.day;
    }
  }

  return lastDay;
}

export function shouldShowOvernight(
  events: readonly GroveEvent[],
  today: string,
  rules: GroveRules,
): boolean {
  const alreadyShown = events.some(
    (event) => event.type === EventType.OvernightShown && event.day === today,
  );
  if (alreadyShown) {
    return false;
  }

  const lastActiveDay = lastActiveDayBefore(events, today);
  if (lastActiveDay === undefined) {
    return false;
  }

  return growthOn(events, lastActiveDay, rules).length > 0;
}

export function shouldShowBedtime(
  events: readonly GroveEvent[],
  today: string,
  nowHour: number,
  rules: GroveRules,
): boolean {
  if (!isAfterHours(nowHour, rules)) {
    return false;
  }

  const alreadyShown = events.some(
    (event) => event.type === EventType.BedtimeShown && event.day === today,
  );

  return !alreadyShown;
}
