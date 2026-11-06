export const Stage = {
  Seed: 'seed',
  Sprout: 'sprout',
  Sapling: 'sapling',
  YoungTree: 'young-tree',
  Tree: 'tree',
  Ancient: 'ancient',
} as const;

export type Stage = (typeof Stage)[keyof typeof Stage];

export const STAGE_THRESHOLDS: readonly {
  stage: Stage;
  minTendedDays: number;
}[] = [
  { stage: Stage.Seed, minTendedDays: 0 },
  { stage: Stage.Sprout, minTendedDays: 1 },
  { stage: Stage.Sapling, minTendedDays: 3 },
  { stage: Stage.YoungTree, minTendedDays: 7 },
  { stage: Stage.Tree, minTendedDays: 15 },
  { stage: Stage.Ancient, minTendedDays: 30 },
];

export function stageFor(tendedDays: number): Stage {
  let stage: Stage = Stage.Seed;

  for (const threshold of STAGE_THRESHOLDS) {
    if (tendedDays >= threshold.minTendedDays) {
      stage = threshold.stage;
    }
  }

  return stage;
}

export function nextThreshold(
  tendedDays: number,
): { stage: Stage; minTendedDays: number } | undefined {
  return STAGE_THRESHOLDS.find(
    (threshold) => threshold.minTendedDays > tendedDays,
  );
}
