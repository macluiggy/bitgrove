import type { GroveEvent } from './event';
import { type GroveRules, isAfterHours } from './rules';
import { WorkKind, workOf } from './work';

/**
 * XP per finished task, by kind. A day never earns more than DAILY_XP_CAP in
 * total, so many tiny tasks never beat one good day (P1, P5), and work after
 * hours earns nothing (P4). XP never decays (P3).
 */
export const XP_BY_WORK: Readonly<Record<WorkKind, number>> = {
  [WorkKind.Feature]: 30,
  [WorkKind.Refactor]: 20,
  [WorkKind.Fix]: 15,
  [WorkKind.Tests]: 10,
  [WorkKind.Docs]: 10,
  [WorkKind.Chore]: 5,
};

export const DAILY_XP_CAP = 100;

/** XP needed to go from level n to n + 1 is n × LEVEL_STEP_XP. */
const LEVEL_STEP_XP = 100;

export interface XpLedger {
  totalXp: number;
  byProject: Map<string, number>;
  byDay: Map<string, number>;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside the current level. */
  levelXp: number;
  /** XP the current level needs in total to reach the next one. */
  nextLevelXp: number;
}

function addTo(map: Map<string, number>, key: string, amount: number): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export function xpLedger(
  events: readonly GroveEvent[],
  rules: GroveRules,
): XpLedger {
  const byProject = new Map<string, number>();
  const byDay = new Map<string, number>();
  // Re-running the tests is not new work: they count once per project and day.
  const testedToday = new Set<string>();

  const chronological = [...events].sort((a, b) =>
    a.at < b.at ? -1 : a.at > b.at ? 1 : 0,
  );

  for (const event of chronological) {
    const work = workOf(event);
    if (work === undefined || isAfterHours(event.hour, rules)) {
      continue;
    }

    if (work === WorkKind.Tests) {
      const key = `${event.project}|${event.day}`;
      if (testedToday.has(key)) {
        continue;
      }
      testedToday.add(key);
    }

    const room = DAILY_XP_CAP - (byDay.get(event.day) ?? 0);
    const earned = Math.min(XP_BY_WORK[work], room);
    if (earned <= 0) {
      continue;
    }

    addTo(byDay, event.day, earned);
    addTo(byProject, event.project, earned);
  }

  let totalXp = 0;
  for (const amount of byDay.values()) {
    totalXp += amount;
  }

  return { totalXp, byProject, byDay };
}

export function levelFor(totalXp: number): LevelProgress {
  let level = 1;
  let remaining = totalXp;

  while (remaining >= level * LEVEL_STEP_XP) {
    remaining -= level * LEVEL_STEP_XP;
    level += 1;
  }

  return { level, levelXp: remaining, nextLevelXp: level * LEVEL_STEP_XP };
}
