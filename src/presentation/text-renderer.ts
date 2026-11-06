import type { OvernightReport } from '../application';
import { type Grove, nextThreshold, Stage } from '../domain';

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
