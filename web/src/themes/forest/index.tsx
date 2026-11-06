import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { type Ecosystem, ERA_THRESHOLDS } from '../../../../src/domain';
import { ERA_EMOJI, ERA_NAME } from '../../../../src/presentation/labels';
import { type SceneProps, type Theme, ThemeId } from '../theme';
import farmSheetUrl from './assets/kenney-tiny-farm/tilemap_packed.png';
import townSheetUrl from './assets/kenney-tiny-town/tilemap_packed.png';
import { layoutEcosystem, type PlotLayout } from './ecosystem-layout';
import { Sheet, type Sprite, TILE_SIZE, TILESHEET_COLUMNS } from './sprites';

// Pixel art is drawn at a whole-number zoom so every pixel stays crisp.
const ZOOM = 3;
const PIXEL = TILE_SIZE * ZOOM;

type Sheets = Record<Sheet, HTMLImageElement>;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

// Tilesheets load once per page; every repaint after that is synchronous.
let sheets: Promise<Sheets> | undefined;

function loadSheets(): Promise<Sheets> {
  sheets ??= Promise.all([
    loadImage(townSheetUrl),
    loadImage(farmSheetUrl),
  ]).then(([town, farm]) => ({ [Sheet.Town]: town, [Sheet.Farm]: farm }));
  return sheets;
}

function useSheets(): Sheets | undefined {
  const [loaded, setLoaded] = useState<Sheets>();

  useEffect(() => {
    let active = true;
    loadSheets().then(
      (value) => active && setLoaded(value),
      () => {},
    );
    return () => {
      active = false;
    };
  }, []);

  return loaded;
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  images: Sheets,
  sprite: Sprite,
  col: number,
  row: number,
  scale: number,
) {
  const image = images[sprite.sheet];
  const cell = PIXEL * scale;

  sprite.tiles.forEach((tileRow, dr) => {
    tileRow.forEach((tile, dc) => {
      ctx.drawImage(
        image,
        (tile % TILESHEET_COLUMNS) * TILE_SIZE,
        Math.floor(tile / TILESHEET_COLUMNS) * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
        (col + dc * scale) * PIXEL,
        (row + dr * scale) * PIXEL,
        cell,
        cell,
      );
    });
  });
}

function paint(
  ctx: CanvasRenderingContext2D,
  layout: PlotLayout,
  images: Sheets,
) {
  ctx.imageSmoothingEnabled = false;

  layout.ground.forEach((sprite, index) => {
    drawSprite(
      ctx,
      images,
      sprite,
      index % layout.cols,
      Math.floor(index / layout.cols),
      1,
    );
  });

  for (const item of layout.items) {
    drawSprite(ctx, images, item.sprite, item.col, item.row, item.scale);
  }
}

function plural(amount: number, singular: string, many: string): string {
  return `${amount} ${amount === 1 ? singular : many}`;
}

function lifeSummary(ecosystem: Ecosystem): string {
  const parts = [plural(ecosystem.trees.length, 'tree', 'trees')];
  if (ecosystem.animals.length > 0) {
    parts.push(plural(ecosystem.animals.length, 'animal', 'animals'));
  }
  if (ecosystem.buildings.length > 0) {
    parts.push(plural(ecosystem.buildings.length, 'building', 'buildings'));
  }
  return parts.join(' · ');
}

/** 0..1 progress through the current era. */
function eraProgress(ecosystem: Ecosystem): number {
  const current = ERA_THRESHOLDS.find((t) => t.era === ecosystem.era);
  const next = ERA_THRESHOLDS.find((t) => t.era === ecosystem.nextEra);
  if (current === undefined || next === undefined) {
    return 1;
  }
  const span = next.minTendedDays - current.minTendedDays;
  return span <= 0 ? 1 : (ecosystem.tendedDays - current.minTendedDays) / span;
}

function EcosystemCard({
  ecosystem,
  images,
}: {
  ecosystem: Ecosystem;
  images: Sheets | undefined;
}) {
  const layout = useMemo(() => layoutEcosystem(ecosystem), [ecosystem]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layout effect: repaint before the browser shows the resized (and so
  // cleared) canvas, so time travel never flashes an empty plot.
  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx !== null && ctx !== undefined && images !== undefined) {
      paint(ctx, layout, images);
    }
  }, [layout, images]);

  const progress = Math.round(eraProgress(ecosystem) * 100);

  return (
    <article class="eco-card">
      <canvas
        ref={canvasRef}
        width={layout.cols * PIXEL}
        height={layout.rows * PIXEL}
        role="img"
        aria-label={`${ecosystem.project}: ${ERA_NAME[ecosystem.era]}, ${lifeSummary(ecosystem)}`}
      />
      <div class="eco-info">
        <h2>
          {ecosystem.project}
          <span class="eco-era">
            {ERA_EMOJI[ecosystem.era]} {ERA_NAME[ecosystem.era]}
          </span>
        </h2>
        <p class="eco-life">{lifeSummary(ecosystem)}</p>
        {ecosystem.nextEra !== undefined && (
          <div
            class="eco-progress"
            role="progressbar"
            aria-label={`Progress to ${ERA_NAME[ecosystem.nextEra]}`}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span class="bar-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        <p class="eco-meta">
          {plural(ecosystem.tendedDays, 'day', 'days')} · {ecosystem.xp} XP
          {ecosystem.nextEra !== undefined &&
          ecosystem.daysToNextEra !== undefined
            ? ` · ${ecosystem.daysToNextEra} to ${ERA_NAME[ecosystem.nextEra]}`
            : ' · fully grown'}
        </p>
      </div>
    </article>
  );
}

function ForestSceneView({ world }: SceneProps) {
  const images = useSheets();

  if (world.ecosystems.length === 0) {
    return (
      <p class="forest-empty">
        Your forest is waiting. Work on a project with your coding agent and its
        first clearing will appear.
      </p>
    );
  }

  return (
    <div class="forest">
      <div class="eco-grid">
        {world.ecosystems.map((ecosystem) => (
          <EcosystemCard
            key={ecosystem.project}
            ecosystem={ecosystem}
            images={images}
          />
        ))}
      </div>
      <p class="forest-credit">
        Pixel art: Tiny Town and Tiny Farm by{' '}
        <a href="https://kenney.nl">Kenney</a> (CC0)
      </p>
    </div>
  );
}

export const forestTheme: Theme = {
  id: ThemeId.Forest,
  name: 'Forest',
  Scene: ForestSceneView,
};
