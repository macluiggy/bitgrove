import {
  AnimalSpecies,
  BuildingKind,
  Stage,
  TreeSpecies,
} from '../../../../src/domain';

/**
 * Sprite catalogue: the only place that knows which tile draws which piece of
 * an ecosystem. Swapping the art, or adding a tileset, only touches this file.
 *
 * Tilesheets (12 columns of 16×16 tiles, indexes left to right, top to bottom):
 * - Town: Kenney "Tiny Town" (CC0), assets/kenney-tiny-town
 * - Farm: Kenney "Tiny Farm" (CC0), assets/kenney-tiny-farm
 */

export const TILE_SIZE = 16;
export const TILESHEET_COLUMNS = 12;

export const Sheet = {
  Town: 'town',
  Farm: 'farm',
} as const;

export type Sheet = (typeof Sheet)[keyof typeof Sheet];

/** A picture made of one or more tiles, as rows of tile indexes. */
export interface Sprite {
  sheet: Sheet;
  tiles: readonly (readonly number[])[];
}

function single(sheet: Sheet, tile: number): Sprite {
  return { sheet, tiles: [[tile]] };
}

export function spriteWidth(sprite: Sprite): number {
  return sprite.tiles[0]?.length ?? 1;
}

export function spriteHeight(sprite: Sprite): number {
  return sprite.tiles.length;
}

export const GROUND = {
  grass: single(Sheet.Town, 0),
  grassTufts: single(Sheet.Town, 1),
  flowers: single(Sheet.Town, 2),
  stonePath: single(Sheet.Town, 43),
} as const;

export const DECOR = {
  sunflower: single(Sheet.Farm, 83),
  bush: single(Sheet.Farm, 39),
  berryBush: single(Sheet.Farm, 78),
  mushrooms: single(Sheet.Town, 29),
  rocks: single(Sheet.Farm, 77),
  tallGrass: single(Sheet.Farm, 80),
} as const;

const SEEDLING = single(Sheet.Farm, 81);

// Per species: [young, grown] tiles. Ancient trees are the grown tile at 2×.
const TREE_TILES: Record<TreeSpecies, readonly [Sprite, Sprite]> = {
  [TreeSpecies.Pine]: [single(Sheet.Farm, 27), single(Sheet.Farm, 15)],
  [TreeSpecies.Oak]: [single(Sheet.Town, 5), single(Sheet.Town, 16)],
  [TreeSpecies.Maple]: [single(Sheet.Town, 27), single(Sheet.Town, 15)],
  [TreeSpecies.Larch]: [single(Sheet.Town, 28), single(Sheet.Town, 3)],
};

/** A tree's look and scale for its species and stage. */
export function treeSprite(
  species: TreeSpecies,
  stage: Stage,
): { sprite: Sprite; scale: number } {
  const [young, grown] = TREE_TILES[species];

  switch (stage) {
    case Stage.Seed:
    case Stage.Sprout:
      return { sprite: SEEDLING, scale: 1 };
    case Stage.Sapling:
    case Stage.YoungTree:
      return { sprite: young, scale: 1 };
    case Stage.Tree:
      return { sprite: grown, scale: 1 };
    case Stage.Ancient:
      return { sprite: grown, scale: 2 };
  }
}

export const ANIMAL_SPRITES: Record<AnimalSpecies, Sprite> = {
  [AnimalSpecies.Sheep]: single(Sheet.Farm, 120),
  [AnimalSpecies.Cow]: single(Sheet.Farm, 121),
  [AnimalSpecies.Chicken]: single(Sheet.Farm, 122),
};

export const BUILDING_SPRITES: Record<BuildingKind, Sprite> = {
  // Red-roofed cabin with a window and a door.
  [BuildingKind.Cabin]: {
    sheet: Sheet.Town,
    tiles: [
      [52, 54],
      [84, 85],
    ],
  },
  [BuildingKind.Well]: single(Sheet.Farm, 73),
  // Blue-roofed village house.
  [BuildingKind.House]: {
    sheet: Sheet.Town,
    tiles: [
      [48, 50],
      [88, 89],
    ],
  },
};
