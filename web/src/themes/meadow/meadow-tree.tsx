import type { JSX } from 'preact';
import { Stage } from '../../../../src/domain';

const BARK = '#8a5a3b';
const LEAF = '#5fa04e';
const LEAF_DARK = '#3f7d3a';
const PINE = '#2f6b45';
const GRASS = '#7cb85e';
const GRASS_EDGE = '#6aa74f';

// One small drawing per growth stage, on a 100×120 canvas with soil at y=110.
const STAGE_DRAWINGS: Record<Stage, () => JSX.Element> = {
  [Stage.Seed]: () => <ellipse cx="50" cy="104" rx="9" ry="6" fill={BARK} />,
  [Stage.Sprout]: () => (
    <g>
      <path d="M50 110 V90" stroke={LEAF_DARK} stroke-width="3" />
      <ellipse
        cx="42"
        cy="88"
        rx="9"
        ry="5"
        fill={LEAF}
        transform="rotate(-25 42 88)"
      />
      <ellipse
        cx="58"
        cy="86"
        rx="9"
        ry="5"
        fill={LEAF}
        transform="rotate(25 58 86)"
      />
    </g>
  ),
  [Stage.Sapling]: () => (
    <g>
      <path d="M50 110 V70" stroke={BARK} stroke-width="4" />
      <circle cx="50" cy="66" r="15" fill={LEAF} />
      <circle cx="38" cy="78" r="8" fill={LEAF_DARK} />
    </g>
  ),
  [Stage.YoungTree]: () => (
    <g>
      <rect x="46" y="66" width="8" height="44" fill={BARK} />
      <circle cx="50" cy="56" r="24" fill={LEAF} />
      <circle cx="36" cy="66" r="12" fill={LEAF_DARK} />
    </g>
  ),
  [Stage.Tree]: () => (
    <g>
      <rect x="44" y="60" width="12" height="50" fill={BARK} />
      <circle cx="50" cy="44" r="28" fill={LEAF} />
      <circle cx="30" cy="58" r="16" fill={LEAF_DARK} />
      <circle cx="70" cy="58" r="16" fill={LEAF_DARK} />
    </g>
  ),
  [Stage.Ancient]: () => (
    <g>
      <rect x="43" y="88" width="14" height="22" fill={BARK} />
      <polygon points="50,6 82,52 18,52" fill={PINE} />
      <polygon points="50,30 88,76 12,76" fill={PINE} />
      <polygon points="50,52 94,96 6,96" fill={PINE} />
    </g>
  ),
};

export function MeadowTreeDrawing({ stage }: { stage: Stage }) {
  const Drawing = STAGE_DRAWINGS[stage];

  return (
    <svg viewBox="0 0 100 120" aria-hidden="true" class="meadow-tree-art">
      {/* Each tree stands on its own patch of grass, wider than the canvas so
          neighbouring patches join into one meadow row. */}
      <rect x="-40" y="108" width="180" height="12" fill={GRASS} />
      <rect x="-40" y="108" width="180" height="2" fill={GRASS_EDGE} />
      <ellipse cx="50" cy="110" rx="30" ry="4" fill="#5b4128" opacity="0.3" />
      <Drawing />
    </svg>
  );
}
