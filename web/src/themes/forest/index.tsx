import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import type { GroveView } from '../../view-model/grove-view';
import { type SceneProps, type Theme, ThemeId } from '../theme';
import tilesheetUrl from './assets/kenney-tiny-town/tilemap_packed.png';
import { type ForestScene, layoutForest } from './forest-layout';
import { TILE_SIZE, TILESHEET_COLUMNS } from './tiles';

// Pixel art is drawn at a whole-number zoom so every pixel stays crisp.
const ZOOM = 3;
const PIXEL = TILE_SIZE * ZOOM;
const PLATE_COLOR = '#5b3a24';
const PLATE_BORDER = '#2e1d12';
const PLATE_TEXT = '#fcefc8';
const LABEL_FONT = `bold ${5 * ZOOM}px ui-monospace, Menlo, monospace`;

function drawTile(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  tile: number,
  col: number,
  row: number,
  scale = 1,
) {
  const sx = (tile % TILESHEET_COLUMNS) * TILE_SIZE;
  const sy = Math.floor(tile / TILESHEET_COLUMNS) * TILE_SIZE;

  ctx.drawImage(
    sheet,
    sx,
    sy,
    TILE_SIZE,
    TILE_SIZE,
    col * PIXEL,
    row * PIXEL,
    PIXEL * scale,
    PIXEL * scale,
  );
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  col: number,
  row: number,
) {
  ctx.font = LABEL_FONT;
  const width = ctx.measureText(text).width + 6 * ZOOM;
  const height = 8 * ZOOM;
  const x = Math.round(col * PIXEL - width / 2);
  const y = Math.round((row + 0.5) * PIXEL - height / 2);

  ctx.fillStyle = PLATE_BORDER;
  ctx.fillRect(x - ZOOM, y - ZOOM, width + 2 * ZOOM, height + 2 * ZOOM);
  ctx.fillStyle = PLATE_COLOR;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = PLATE_TEXT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2 + ZOOM / 2);
}

function paint(
  ctx: CanvasRenderingContext2D,
  scene: ForestScene,
  sheet: HTMLImageElement,
) {
  ctx.imageSmoothingEnabled = false;

  scene.ground.forEach((tile, index) => {
    drawTile(
      ctx,
      sheet,
      tile,
      index % scene.cols,
      Math.floor(index / scene.cols),
    );
  });

  for (const placed of scene.tiles) {
    drawTile(ctx, sheet, placed.tile, placed.col, placed.row, placed.scale);
  }

  for (const label of scene.labels) {
    drawLabel(ctx, label.text, label.col, label.row);
  }
}

function describe(grove: GroveView): string {
  if (grove.isEmpty) {
    return 'A quiet forest. No clearings yet.';
  }

  const clearings = grove.trees
    .map(
      (tree) =>
        `${tree.project}: ${tree.tendedDays} tended days, ${tree.stage}`,
    )
    .join('; ');
  return `A forest with one clearing per project. ${clearings}.`;
}

// The tilesheet loads once per page, then every repaint is synchronous.
let tilesheet: Promise<HTMLImageElement> | undefined;

function loadTilesheet(): Promise<HTMLImageElement> {
  tilesheet ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = tilesheetUrl;
  });
  return tilesheet;
}

function useTilesheet(): HTMLImageElement | undefined {
  const [sheet, setSheet] = useState<HTMLImageElement>();

  useEffect(() => {
    let active = true;
    loadTilesheet().then(
      (image) => active && setSheet(image),
      () => {},
    );
    return () => {
      active = false;
    };
  }, []);

  return sheet;
}

function ForestSceneView({ grove }: SceneProps) {
  const scene = useMemo(() => layoutForest(grove), [grove]);
  const sheet = useTilesheet();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layout effect: repaint before the browser shows the resized (and so
  // cleared) canvas, so scrubbing through days never flashes empty.
  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx !== null && ctx !== undefined && sheet !== undefined) {
      paint(ctx, scene, sheet);
    }
  }, [scene, sheet]);

  return (
    <div class="forest">
      <canvas
        ref={canvasRef}
        width={scene.cols * PIXEL}
        height={scene.rows * PIXEL}
        role="img"
        aria-label={describe(grove)}
      />
      {grove.isEmpty && (
        <p class="forest-empty">
          Your forest is waiting. Work on a project with your coding agent and
          its first clearing will appear.
        </p>
      )}
      <p class="forest-credit">
        Pixel art: Tiny Town by <a href="https://kenney.nl">Kenney</a> (CC0)
      </p>
    </div>
  );
}

export const forestTheme: Theme = {
  id: ThemeId.Forest,
  name: 'Forest',
  Scene: ForestSceneView,
};
