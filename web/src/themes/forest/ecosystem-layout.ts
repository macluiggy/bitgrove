import {
  type BuildingKind,
  type Ecosystem,
  Era,
  hashText,
  Stage,
  seededRandom,
  TreeSpecies,
} from '../../../../src/domain';
import {
  ANIMAL_SPRITES,
  BUILDING_SPRITES,
  DECOR,
  GROUND,
  type Sprite,
  spriteHeight,
  spriteWidth,
  treeSprite,
} from './sprites';

/**
 * Pure layout of one ecosystem's plot: decides which sprite goes where. It is
 * seeded by the project name, so a plot never reshuffles: new life only adds
 * to what is already there. The canvas painter just draws this.
 */

export const ItemKind = {
  Frame: 'frame',
  Building: 'building',
  Tree: 'tree',
  Animal: 'animal',
  Bush: 'bush',
  Decor: 'decor',
} as const;

export type ItemKind = (typeof ItemKind)[keyof typeof ItemKind];

export interface PlacedItem {
  kind: ItemKind;
  sprite: Sprite;
  /** Top-left cell and size, in tiles (sprite size × scale). */
  col: number;
  row: number;
  width: number;
  height: number;
  scale: number;
  building?: BuildingKind;
}

export interface PlotLayout {
  cols: number;
  rows: number;
  /** Ground sprite per cell, row by row. */
  ground: Sprite[];
  /** In paint order: lower on screen is drawn later, on top. */
  items: PlacedItem[];
}

// The plot widens as the ecosystem reaches a new era.
const PLOT_SIZE: Record<Era, { cols: number; rows: number }> = {
  [Era.Clearing]: { cols: 8, rows: 6 },
  [Era.Grove]: { cols: 9, rows: 7 },
  [Era.Wood]: { cols: 10, rows: 8 },
  [Era.Forest]: { cols: 12, rows: 9 },
  [Era.Hamlet]: { cols: 13, rows: 10 },
  [Era.Village]: { cols: 15, rows: 11 },
};

// How much of the border is wild forest framing the plot, per era.
const FRAME_DENSITY: Record<Era, number> = {
  [Era.Clearing]: 0.2,
  [Era.Grove]: 0.35,
  [Era.Wood]: 0.5,
  [Era.Forest]: 0.65,
  [Era.Hamlet]: 0.7,
  [Era.Village]: 0.7,
};

const FRAME_SPRITES: readonly Sprite[] = [
  treeSprite(TreeSpecies.Pine, Stage.Tree).sprite,
  treeSprite(TreeSpecies.Oak, Stage.Tree).sprite,
  treeSprite(TreeSpecies.Pine, Stage.YoungTree).sprite,
  treeSprite(TreeSpecies.Maple, Stage.Tree).sprite,
];

const TUFT_CHANCE = 0.18;
const SUNFLOWER_EVERY = 4;

class Plot {
  readonly items: PlacedItem[] = [];
  readonly ground: Sprite[];
  private readonly taken = new Set<string>();

  constructor(
    readonly cols: number,
    readonly rows: number,
    groundAt: (col: number, row: number) => Sprite,
  ) {
    this.ground = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        this.ground.push(groundAt(col, row));
      }
    }
  }

  isInterior(col: number, row: number): boolean {
    return col > 0 && row > 0 && col < this.cols - 1 && row < this.rows - 1;
  }

  fits(col: number, row: number, width: number, height: number): boolean {
    for (let dc = 0; dc < width; dc += 1) {
      for (let dr = 0; dr < height; dr += 1) {
        if (
          !this.isInterior(col + dc, row + dr) ||
          this.taken.has(`${col + dc},${row + dr}`)
        ) {
          return false;
        }
      }
    }
    return true;
  }

  take(col: number, row: number, width = 1, height = 1): void {
    for (let dc = 0; dc < width; dc += 1) {
      for (let dr = 0; dr < height; dr += 1) {
        this.taken.add(`${col + dc},${row + dr}`);
      }
    }
  }

  isFree(col: number, row: number): boolean {
    return !this.taken.has(`${col},${row}`);
  }

  setGround(col: number, row: number, sprite: Sprite): void {
    this.ground[row * this.cols + col] = sprite;
  }

  /** Places a sprite at the first spot in `order` where it fits. */
  place(
    order: readonly (readonly [number, number])[],
    kind: ItemKind,
    sprite: Sprite,
    scale = 1,
    building?: BuildingKind,
  ): boolean {
    const width = spriteWidth(sprite) * scale;
    const height = spriteHeight(sprite) * scale;

    for (const [col, row] of order) {
      if (this.fits(col, row, width, height)) {
        this.take(col, row, width, height);
        this.items.push({
          kind,
          sprite,
          col,
          row,
          width,
          height,
          scale,
          ...(building === undefined ? {} : { building }),
        });
        return true;
      }
    }
    return false;
  }
}

function cellChance(project: string, label: string, col: number, row: number) {
  return hashText(`${project}:${label}:${col}:${row}`) / 4294967296;
}

export function layoutEcosystem(ecosystem: Ecosystem): PlotLayout {
  const { project } = ecosystem;
  const { cols, rows } = PLOT_SIZE[ecosystem.era];
  const plot = new Plot(cols, rows, (col, row) =>
    cellChance(project, 'tuft', col, row) < TUFT_CHANCE
      ? GROUND.grassTufts
      : GROUND.grass,
  );

  // Wild forest around the edge frames the plot; it thickens with the era.
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const onEdge =
        row === 0 || col === 0 || row === rows - 1 || col === cols - 1;
      if (
        onEdge &&
        cellChance(project, 'frame', col, row) < FRAME_DENSITY[ecosystem.era]
      ) {
        const index = hashText(`${project}:frame-tree:${col}:${row}`);
        const sprite = FRAME_SPRITES[index % FRAME_SPRITES.length];
        if (sprite !== undefined) {
          plot.items.push({
            kind: ItemKind.Frame,
            sprite,
            col,
            row,
            width: 1,
            height: 1,
            scale: 1,
          });
        }
      }
    }
  }

  // Interior cells in an order fixed by the project name.
  const random = seededRandom(hashText(project));
  const interior: [number, number][] = [];
  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      interior.push([col, row]);
    }
  }
  const scattered = interior
    .map((cell) => ({ cell, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ cell }) => cell);

  // Buildings settle near the middle, people like the centre of the clearing.
  const centreCol = cols / 2;
  const centreRow = rows / 2;
  const central = [...scattered].sort(
    (a, b) =>
      Math.hypot(a[0] - centreCol, a[1] - centreRow) -
      Math.hypot(b[0] - centreCol, b[1] - centreRow),
  );
  for (const building of ecosystem.buildings) {
    plot.place(
      central,
      ItemKind.Building,
      BUILDING_SPRITES[building.kind],
      1,
      building.kind,
    );
  }

  // Docs lay a stone path from the bottom edge up into the plot.
  const pathCol = Math.floor(cols / 2);
  let laid = 0;
  for (let row = rows - 2; row >= 1 && laid < ecosystem.paths; row -= 1) {
    if (plot.isFree(pathCol, row)) {
      plot.setGround(pathCol, row, GROUND.stonePath);
      plot.take(pathCol, row);
      laid += 1;
    }
  }

  // Oldest trees first: ancient ones claim their bigger spot early.
  for (const tree of ecosystem.trees) {
    const { sprite, scale } = treeSprite(tree.species, tree.stage);
    plot.place(scattered, ItemKind.Tree, sprite, scale);
  }

  for (const animal of ecosystem.animals) {
    plot.place(
      [...scattered].reverse(),
      ItemKind.Animal,
      ANIMAL_SPRITES[animal.species],
    );
  }

  for (let index = 0; index < ecosystem.bushes; index += 1) {
    const sprite = index % 2 === 0 ? DECOR.bush : DECOR.berryBush;
    plot.place(scattered, ItemKind.Bush, sprite);
  }

  // Fixes make flowers bloom on free grass; every few, a sunflower.
  let bloomed = 0;
  for (const [col, row] of scattered) {
    if (bloomed >= ecosystem.flowers) {
      break;
    }
    if (!plot.isFree(col, row)) {
      continue;
    }
    bloomed += 1;
    if (bloomed % SUNFLOWER_EVERY === 0) {
      plot.place([[col, row]], ItemKind.Decor, DECOR.sunflower);
    } else {
      plot.setGround(col, row, GROUND.flowers);
    }
  }

  return {
    cols,
    rows,
    ground: plot.ground,
    items: plot.items.sort(
      (a, b) => a.row + a.height - (b.row + b.height) || a.col - b.col,
    ),
  };
}
