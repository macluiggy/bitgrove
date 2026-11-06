export interface GroveRules {
  endHour: number;
  dayBoundaryHour: number;
}

export const DEFAULT_RULES: GroveRules = {
  endHour: 19,
  dayBoundaryHour: 4,
};

export function isAfterHours(hour: number, rules: GroveRules): boolean {
  return hour >= rules.endHour || hour < rules.dayBoundaryHour;
}
