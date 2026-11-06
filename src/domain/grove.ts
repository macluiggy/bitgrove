import { type GroveEvent, isAccomplishment } from './event';
import { type GroveRules, isAfterHours } from './rules';
import { type Stage, stageFor } from './stage';

export interface Tree {
  project: string;
  tendedDays: number;
  stage: Stage;
}

export interface Grove {
  trees: Tree[];
  totalTendedDays: number;
}

export interface TreeGrowth {
  project: string;
  tendedDaysBefore: number;
  tendedDaysAfter: number;
  stageBefore: Stage;
  stageAfter: Stage;
  stageChanged: boolean;
}

function compareProjects(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

export function tendedDaysByProject(
  events: readonly GroveEvent[],
  rules: GroveRules,
  untilDayInclusive?: string,
): Map<string, Set<string>> {
  const tendedDays = new Map<string, Set<string>>();

  for (const event of events) {
    if (untilDayInclusive !== undefined && event.day > untilDayInclusive) {
      continue;
    }

    let projectDays = tendedDays.get(event.project);
    if (projectDays === undefined) {
      projectDays = new Set<string>();
      tendedDays.set(event.project, projectDays);
    }

    if (isAccomplishment(event) && !isAfterHours(event.hour, rules)) {
      projectDays.add(event.day);
    }
  }

  return tendedDays;
}

export function buildGrove(
  events: readonly GroveEvent[],
  rules: GroveRules,
  untilDayInclusive?: string,
): Grove {
  const tendedDays = tendedDaysByProject(events, rules, untilDayInclusive);
  const trees: Tree[] = [];
  let totalTendedDays = 0;

  for (const [project, days] of tendedDays) {
    const dayCount = days.size;
    totalTendedDays += dayCount;
    trees.push({
      project,
      tendedDays: dayCount,
      stage: stageFor(dayCount),
    });
  }

  trees.sort(
    (a, b) =>
      b.tendedDays - a.tendedDays || compareProjects(a.project, b.project),
  );

  return { trees, totalTendedDays };
}

export function growthOn(
  events: readonly GroveEvent[],
  day: string,
  rules: GroveRules,
): TreeGrowth[] {
  const tendedDays = tendedDaysByProject(events, rules, day);
  const growth: TreeGrowth[] = [];

  for (const [project, days] of tendedDays) {
    if (!days.has(day)) {
      continue;
    }

    let tendedDaysBefore = 0;
    for (const tendedDay of days) {
      if (tendedDay < day) {
        tendedDaysBefore += 1;
      }
    }

    const tendedDaysAfter = tendedDaysBefore + 1;
    const stageBefore = stageFor(tendedDaysBefore);
    const stageAfter = stageFor(tendedDaysAfter);

    growth.push({
      project,
      tendedDaysBefore,
      tendedDaysAfter,
      stageBefore,
      stageAfter,
      stageChanged: stageBefore !== stageAfter,
    });
  }

  growth.sort((a, b) => compareProjects(a.project, b.project));

  return growth;
}
