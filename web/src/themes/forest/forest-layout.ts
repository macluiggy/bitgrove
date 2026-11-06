import { Stage } from '../../../../src/domain';
import type { GroveView, TreeView } from '../../view-model/grove-view';
import { ForestTile } from './tiles';

/**
 * Pure layout of the Forest theme: decides which tile goes where, so it can be
 * tested without a browser. The canvas only paints this scene.
 */

export const TileKind = {
  Forest: 'forest',
  Plant: 'plant',
  MainTree: 'main-tree',
  Sign: 'sign',
} as const;

export type TileKind = (typeof TileKind)[keyof typeof TileKind];

/** A tile drawn at (col, row) in tile units, covering scale × scale tiles. */
export interface PlacedTile {
  tile: number;
  col: number;
  row: number;
  scale: number;
  kind: TileKind;
  owner: string | undefined;
}

export interface Clearing {
  project: string;
  col: number;
  row: number;
  width: number;
  height: number;
}

export interface ForestLabel {
  text: string;
  /** Horizontal centre, in tile units. */
  col: number;
  row: number;
}

export interface ForestScene {
  cols: number;
  rows: number;
  /** Ground tile per cell, row by row. */
  ground: number[];
  tiles: PlacedTile[];
  clearings: Clearing[];
  labels: ForestLabel[];
}

const CLEARING_WIDTH = 9;
const CLEARING_HEIGHT = 7;
const CLEARING_GAP = 2;
const MARGIN = 2;
const CLEARINGS_PER_ROW = 3;
const PLANTS_PER_TENDED_DAY = 2;
const FOREST_DENSITY = 0.82;
const GROUND_SEED = 'bitgrove:ground';
const FOREST_SEED = 'bitgrove:forest';

const MAIN_TREE: Record<Stage, { tile: number; scale: number }> = {
  [Stage.Seed]: { tile: ForestTile.DirtMound, scale: 1 },
  [Stage.Sprout]: { tile: ForestTile.Sprouts, scale: 1 },
  [Stage.Sapling]: { tile: ForestTile.Bush, scale: 1 },
  [Stage.YoungTree]: { tile: ForestTile.RoundTree, scale: 2 },
  [Stage.Tree]: { tile: ForestTile.RoundTree, scale: 3 },
  [Stage.Ancient]: { tile: ForestTile.SmallPine, scale: 3 },
};

const PLANTS: readonly number[] = [
  ForestTile.Bush,
  ForestTile.RoundTree,
  ForestTile.SmallPine,
  ForestTile.SmallPine,
  ForestTile.Sprouts,
  ForestTile.Flowers,
  ForestTile.Flowers,
  ForestTile.Mushrooms,
  ForestTile.AutumnRoundTree,
  ForestTile.AutumnPine,
];

const FOREST_TREES: readonly number[] = [
  ForestTile.SmallPine,
  ForestTile.SmallPine,
  ForestTile.RoundTree,
  ForestTile.Bush,
  ForestTile.AutumnPine,
  ForestTile.AutumnSmallPine,
];

// FNV-1a string hash: a stable seed per project name.
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

// mulberry32: tiny deterministic random numbers in [0, 1).
function randomFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function cellRandom(seed: string, col: number, row: number): number {
  return randomFrom(hash(`${seed}:${col}:${row}`))();
}

function pick<T>(items: readonly T[], random: number): T {
  const item = items[Math.floor(random * items.length)];
  if (item === undefined) {
    throw new Error('pick() needs a non-empty list');
  }
  return item;
}

function groundTile(col: number, row: number): number {
  const random = cellRandom(GROUND_SEED, col, row);
  if (random < 0.05) {
    return ForestTile.Flowers;
  }
  if (random < 0.22) {
    return ForestTile.GrassTufts;
  }
  return ForestTile.Grass;
}

function layoutClearing(tree: TreeView, origin: Clearing): PlacedTile[] {
  const tiles: PlacedTile[] = [];
  const taken = new Set<string>();
  const take = (col: number, row: number) => taken.add(`${col},${row}`);

  // Main tree: centred, standing on the row above the name plate.
  const main = MAIN_TREE[tree.stage];
  const baseRow = CLEARING_HEIGHT - 2;
  const mainCol = Math.floor(CLEARING_WIDTH / 2) - Math.floor(main.scale / 2);
  const mainRow = baseRow - main.scale + 1;
  for (let dc = -1; dc <= main.scale; dc += 1) {
    for (let dr = 0; dr < main.scale; dr += 1) {
      take(mainCol + dc, mainRow + dr);
    }
  }
  tiles.push({
    tile: main.tile,
    col: origin.col + mainCol,
    row: origin.row + mainRow,
    scale: main.scale,
    kind: TileKind.MainTree,
    owner: tree.project,
  });

  // The bottom row is for the name plate; the sign sits just above it.
  for (let col = 0; col < CLEARING_WIDTH; col += 1) {
    take(col, CLEARING_HEIGHT - 1);
  }
  const signCol = 1;
  take(signCol, baseRow);
  tiles.push({
    tile: ForestTile.Sign,
    col: origin.col + signCol,
    row: origin.row + baseRow,
    scale: 1,
    kind: TileKind.Sign,
    owner: tree.project,
  });

  // Plants fill free spots in an order fixed by the project name, so the
  // clearing only gains plants as days are tended, never reshuffles.
  const spots: [number, number][] = [];
  for (let row = 0; row < CLEARING_HEIGHT; row += 1) {
    for (let col = 0; col < CLEARING_WIDTH; col += 1) {
      if (!taken.has(`${col},${row}`)) {
        spots.push([col, row]);
      }
    }
  }

  const random = randomFrom(hash(tree.project));
  const order = spots
    .map((spot) => ({ spot, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ spot }) => spot);

  const plantCount = Math.min(
    order.length,
    tree.tendedDays * PLANTS_PER_TENDED_DAY,
  );

  for (const [col, row] of order.slice(0, plantCount)) {
    tiles.push({
      tile: pick(PLANTS, random()),
      col: origin.col + col,
      row: origin.row + row,
      scale: 1,
      kind: TileKind.Plant,
      owner: tree.project,
    });
  }

  return tiles;
}

function insideAny(clearings: readonly Clearing[], col: number, row: number) {
  return clearings.some(
    (c) =>
      col >= c.col &&
      col < c.col + c.width &&
      row >= c.row &&
      row < c.row + c.height,
  );
}

function paintOrder(a: PlacedTile, b: PlacedTile): number {
  return a.row + a.scale - (b.row + b.scale) || a.col - b.col;
}

export function layoutForest(grove: GroveView): ForestScene {
  const count = grove.trees.length;
  const perRow = Math.max(1, Math.min(count, CLEARINGS_PER_ROW));
  const clearingRows = Math.max(1, Math.ceil(count / CLEARINGS_PER_ROW));

  const cols =
    MARGIN * 2 + perRow * CLEARING_WIDTH + (perRow - 1) * CLEARING_GAP;
  const rows =
    MARGIN * 2 +
    clearingRows * CLEARING_HEIGHT +
    (clearingRows - 1) * CLEARING_GAP;

  const clearings: Clearing[] = grove.trees.map((tree, index) => ({
    project: tree.project,
    col: MARGIN + (index % CLEARINGS_PER_ROW) * (CLEARING_WIDTH + CLEARING_GAP),
    row:
      MARGIN +
      Math.floor(index / CLEARINGS_PER_ROW) * (CLEARING_HEIGHT + CLEARING_GAP),
    width: CLEARING_WIDTH,
    height: CLEARING_HEIGHT,
  }));

  const ground: number[] = [];
  const tiles: PlacedTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      ground.push(groundTile(col, row));

      if (
        !insideAny(clearings, col, row) &&
        cellRandom(FOREST_SEED, col, row) < FOREST_DENSITY
      ) {
        tiles.push({
          tile: pick(FOREST_TREES, cellRandom(`${FOREST_SEED}:tree`, col, row)),
          col,
          row,
          scale: 1,
          kind: TileKind.Forest,
          owner: undefined,
        });
      }
    }
  }

  grove.trees.forEach((tree, index) => {
    const clearing = clearings[index];
    if (clearing !== undefined) {
      tiles.push(...layoutClearing(tree, clearing));
    }
  });

  return {
    cols,
    rows,
    ground,
    tiles: tiles.sort(paintOrder),
    clearings,
    labels: clearings.map((clearing) => ({
      text: clearing.project,
      col: clearing.col + clearing.width / 2,
      row: clearing.row + clearing.height - 1,
    })),
  };
}
