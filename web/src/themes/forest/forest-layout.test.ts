import { describe, expect, test } from 'bun:test';
import { Stage } from '../../../../src/domain';
import type { GroveView, TreeView } from '../../view-model/grove-view';
import { type ForestScene, layoutForest, TileKind } from './forest-layout';

function tree(project: string, tendedDays: number, stage: Stage): TreeView {
  return {
    project,
    stage,
    tendedDays,
    nextStage: undefined,
    daysToNextStage: undefined,
  };
}

function grove(trees: TreeView[]): GroveView {
  return {
    trees,
    totalTendedDays: trees.reduce((sum, t) => sum + t.tendedDays, 0),
    isEmpty: trees.length === 0,
  };
}

function ownedBy(scene: ForestScene, project: string, kind: TileKind) {
  return scene.tiles.filter(
    (tile) => tile.owner === project && tile.kind === kind,
  );
}

function relativeTo(scene: ForestScene, project: string) {
  const clearing = scene.clearings.find((c) => c.project === project);
  if (clearing === undefined) {
    throw new Error(`no clearing for ${project}`);
  }

  return scene.tiles
    .filter((tile) => tile.owner === project)
    .map((tile) => ({
      ...tile,
      col: tile.col - clearing.col,
      row: tile.row - clearing.row,
    }));
}

describe('layoutForest', () => {
  test('an empty grove is a quiet forest with no clearings', () => {
    const scene = layoutForest(grove([]));

    expect(scene.clearings).toEqual([]);
    expect(scene.labels).toEqual([]);
    expect(scene.cols).toBeGreaterThan(0);
    expect(scene.rows).toBeGreaterThan(0);
    expect(scene.ground).toHaveLength(scene.cols * scene.rows);
  });

  test('every project gets its own clearing, a sign and its name', () => {
    const scene = layoutForest(
      grove([tree('api', 5, Stage.Sapling), tree('web', 1, Stage.Sprout)]),
    );

    expect(scene.clearings.map((c) => c.project)).toEqual(['api', 'web']);
    expect(ownedBy(scene, 'api', TileKind.Sign)).toHaveLength(1);
    expect(ownedBy(scene, 'web', TileKind.Sign)).toHaveLength(1);
    expect(scene.labels.map((label) => label.text)).toEqual(['api', 'web']);
  });

  test('the same grove always draws the same forest', () => {
    const input = grove([
      tree('api', 9, Stage.YoungTree),
      tree('web', 2, Stage.Sprout),
    ]);

    expect(layoutForest(input)).toEqual(layoutForest(input));
  });

  test('more tended days fill a clearing with more plants', () => {
    const young = layoutForest(grove([tree('api', 2, Stage.Sprout)]));
    const lush = layoutForest(grove([tree('api', 12, Stage.YoungTree)]));

    expect(ownedBy(lush, 'api', TileKind.Plant).length).toBeGreaterThan(
      ownedBy(young, 'api', TileKind.Plant).length,
    );
  });

  test('a clearing never overflows, however many days', () => {
    const scene = layoutForest(grove([tree('api', 500, Stage.Ancient)]));
    const clearing = scene.clearings[0];
    const plants = ownedBy(scene, 'api', TileKind.Plant);

    expect(clearing).toBeDefined();
    for (const plant of plants) {
      expect(plant.col).toBeGreaterThanOrEqual(clearing?.col ?? 0);
      expect(plant.col).toBeLessThan(
        (clearing?.col ?? 0) + (clearing?.width ?? 0),
      );
      expect(plant.row).toBeGreaterThanOrEqual(clearing?.row ?? 0);
      expect(plant.row).toBeLessThan(
        (clearing?.row ?? 0) + (clearing?.height ?? 0),
      );
    }
    const spots = new Set(plants.map((plant) => `${plant.col},${plant.row}`));
    expect(spots.size).toBe(plants.length);
  });

  test("a project's clearing looks the same whatever other projects exist", () => {
    const alone = layoutForest(grove([tree('api', 6, Stage.Sapling)]));
    const withOthers = layoutForest(
      grove([
        tree('billing', 20, Stage.Tree),
        tree('api', 6, Stage.Sapling),
        tree('web', 1, Stage.Sprout),
      ]),
    );

    expect(relativeTo(withOthers, 'api')).toEqual(relativeTo(alone, 'api'));
  });

  test('the main tree grows bigger with its stage', () => {
    const seed = ownedBy(
      layoutForest(grove([tree('api', 0, Stage.Seed)])),
      'api',
      TileKind.MainTree,
    );
    const ancient = ownedBy(
      layoutForest(grove([tree('api', 30, Stage.Ancient)])),
      'api',
      TileKind.MainTree,
    );

    expect(seed).toHaveLength(1);
    expect(ancient).toHaveLength(1);
    expect(ancient[0]?.scale ?? 0).toBeGreaterThan(seed[0]?.scale ?? 0);
    expect(ancient[0]?.tile).not.toBe(seed[0]?.tile);
  });
});
