import type { OvernightReport } from '../application';
import {
  type Ecosystem,
  type Grove,
  nextThreshold,
  Stage,
  type World,
} from '../domain';
import { ERA_EMOJI, ERA_NAME } from './labels';

const STAGE_EMOJI = {
  [Stage.Seed]: '🌰',
  [Stage.Sprout]: '🌱',
  [Stage.Sapling]: '🌿',
  [Stage.YoungTree]: '🪴',
  [Stage.Tree]: '🌳',
  [Stage.Ancient]: '🌲',
} as const satisfies Record<Stage, string>;

const EMPTY_GROVE_MESSAGE =
  'Your grove is empty. Work on a project with your coding agent and your first seed will be planted.';
const BEDTIME_MESSAGE =
  '🌙 The grove is asleep for today. Nothing grows after hours, so this is a good moment to stop. See you tomorrow.';
const OVERNIGHT_HEADER = '🌙 While you rested, your grove grew:';

function dayLabel(count: number): string {
  return count === 1 ? 'day' : 'days';
}

export function renderGrove(grove: Grove): string {
  if (grove.trees.length === 0) {
    return EMPTY_GROVE_MESSAGE;
  }

  const projectWidth = Math.max(
    ...grove.trees.map((tree) => tree.project.length),
  );
  const dayWidth = Math.max(
    ...grove.trees.map((tree) => String(tree.tendedDays).length),
  );

  const treeLines = grove.trees.map((tree) => {
    const emoji = STAGE_EMOJI[tree.stage];
    const days = String(tree.tendedDays).padStart(dayWidth);
    const base = `${emoji} ${tree.project.padEnd(projectWidth)}  ${days} ${dayLabel(tree.tendedDays)}`;
    const next = nextThreshold(tree.tendedDays);

    if (next === undefined) {
      return base;
    }

    const remaining = next.minTendedDays - tree.tendedDays;
    return `${base} · ${remaining} to ${STAGE_EMOJI[next.stage]}`;
  });

  return [
    `Bitgrove · ${grove.totalTendedDays} tended ${dayLabel(grove.totalTendedDays)}`,
    '',
    ...treeLines,
  ].join('\n');
}

export function renderOvernight(report: OvernightReport): string {
  const growthLines = report.growth.map((growth) => {
    if (growth.stageChanged) {
      return `  ${STAGE_EMOJI[growth.stageBefore]} → ${STAGE_EMOJI[growth.stageAfter]} ${growth.project}`;
    }

    return `  ${STAGE_EMOJI[growth.stageAfter]} ${growth.project} (+1 tended day)`;
  });

  return [OVERNIGHT_HEADER, ...growthLines].join('\n');
}

export function renderBedtime(): string {
  return BEDTIME_MESSAGE;
}

function count(amount: number, singular: string, plural: string): string {
  return `${amount} ${amount === 1 ? singular : plural}`;
}

function ecosystemDetails(ecosystem: Ecosystem): string {
  const parts: string[] = [ERA_NAME[ecosystem.era]];

  if (ecosystem.trees.length > 0) {
    parts.push(count(ecosystem.trees.length, 'tree', 'trees'));
  }
  if (ecosystem.animals.length > 0) {
    parts.push(count(ecosystem.animals.length, 'animal', 'animals'));
  }
  if (ecosystem.buildings.length > 0) {
    parts.push(count(ecosystem.buildings.length, 'building', 'buildings'));
  }

  parts.push(count(ecosystem.tendedDays, 'day', 'days'));

  if (
    ecosystem.nextEra !== undefined &&
    ecosystem.daysToNextEra !== undefined
  ) {
    parts.push(`${ecosystem.daysToNextEra} to ${ERA_NAME[ecosystem.nextEra]}`);
  }

  return parts.join(' · ');
}

export function renderWorld(world: World): string {
  if (world.ecosystems.length === 0) {
    return EMPTY_GROVE_MESSAGE;
  }

  const { level, levelXp, nextLevelXp } = world.level;
  const header = `Bitgrove · Level ${level} · ${world.totalXp} XP (${levelXp}/${nextLevelXp} to level ${level + 1})`;
  const width = Math.max(...world.ecosystems.map((e) => e.project.length));

  const lines = world.ecosystems.map(
    (ecosystem) =>
      `${ERA_EMOJI[ecosystem.era]} ${ecosystem.project.padEnd(width)}  ${ecosystemDetails(ecosystem)}`,
  );

  return [header, '', ...lines].join('\n');
}
