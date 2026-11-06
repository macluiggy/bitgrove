// Tile indexes in Kenney's Tiny Town tilesheet (assets/kenney-tiny-town,
// CC0): 12 columns of 16×16 tiles, counted left to right, top to bottom.
export const TILE_SIZE = 16;
export const TILESHEET_COLUMNS = 12;

export const ForestTile = {
  Grass: 0,
  GrassTufts: 1,
  Flowers: 2,
  AutumnPine: 3,
  // Tile 4 (a pine) is left out: its fill is the grass colour, so on grass
  // it reads as an empty outline.
  Bush: 5,
  AutumnRoundTree: 15,
  RoundTree: 16,
  Sprouts: 17,
  AutumnSmallPine: 27,
  SmallPine: 28,
  Mushrooms: 29,
  DirtMound: 39,
  Sign: 83,
} as const;
