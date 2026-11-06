import { describe, expect, test } from 'bun:test';
import { nextThreshold, STAGE_THRESHOLDS, Stage, stageFor } from './stage';

describe('stageFor', () => {
  test('maps tended days to stages at every threshold', () => {
    expect(stageFor(0)).toBe(Stage.Seed);
    expect(stageFor(1)).toBe(Stage.Sprout);
    expect(stageFor(2)).toBe(Stage.Sprout);
    expect(stageFor(3)).toBe(Stage.Sapling);
    expect(stageFor(7)).toBe(Stage.YoungTree);
    expect(stageFor(14)).toBe(Stage.YoungTree);
    expect(stageFor(15)).toBe(Stage.Tree);
    expect(stageFor(30)).toBe(Stage.Ancient);
    expect(stageFor(100)).toBe(Stage.Ancient);
  });
});

describe('nextThreshold', () => {
  test('returns the next stage above the given day count', () => {
    expect(nextThreshold(0)).toEqual({
      stage: Stage.Sprout,
      minTendedDays: 1,
    });
    expect(nextThreshold(2)).toEqual({
      stage: Stage.Sapling,
      minTendedDays: 3,
    });
  });

  test('returns undefined at the last threshold', () => {
    expect(nextThreshold(30)).toBeUndefined();
    expect(nextThreshold(100)).toBeUndefined();
  });
});

describe('STAGE_THRESHOLDS', () => {
  test('is ordered from seed to ancient', () => {
    expect(STAGE_THRESHOLDS.map((threshold) => threshold.stage)).toEqual([
      Stage.Seed,
      Stage.Sprout,
      Stage.Sapling,
      Stage.YoungTree,
      Stage.Tree,
      Stage.Ancient,
    ]);
  });
});
