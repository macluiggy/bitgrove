import type { Clock, LocalNow } from '../application';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function localTimeOf(instant: Date): LocalNow {
  return {
    instant: instant.toISOString(),
    localDate: `${instant.getFullYear()}-${pad2(instant.getMonth() + 1)}-${pad2(instant.getDate())}`,
    localHour: instant.getHours(),
  };
}

export class SystemClock implements Clock {
  now(): LocalNow {
    return localTimeOf(new Date());
  }
}
