import { describe, expect, test } from 'bun:test';
import type { OvernightReport } from '../application';
import {
  BuildingKind,
  type Ecosystem,
  Era,
  type Grove,
  Stage,
  TreeSpecies,
  type World,
} from '../domain';
import {
  renderBedtime,
  renderGrove,
  renderOvernight,
  renderWorld,
} from './text-renderer';

function ecosystem(overrides: Partial<Ecosystem>): Ecosystem {
  return {
    project: 'api',
    tendedDays: 0,
    era: Era.Clearing,
    nextEra: Era.Grove,
    daysToNextEra: 3,
    trees: [],
    animals: [],
    flowers: 0,
    bushes: 0,
    paths: 0,
    buildings: [],
    xp: 0,
    ...overrides,
  };
}

const tree = { id: 0, species: TreeSpecies.Oak, age: 1, stage: Stage.Sprout };

describe('renderWorld', () => {
  test('an empty world keeps the empty message', () => {
    expect(
      renderWorld({
        ecosystems: [],
        totalXp: 0,
        level: { level: 1, levelXp: 0, nextLevelXp: 100 },
      }),
    ).toBe(
      'Your grove is empty. Work on a project with your coding agent and your first seed will be planted.',
    );
  });

  test('shows the level and every ecosystem with its era and life', () => {
    const world: World = {
      totalXp: 140,
      level: { level: 2, levelXp: 40, nextLevelXp: 200 },
      ecosystems: [
        ecosystem({
          project: 'api',
          tendedDays: 46,
          era: Era.Hamlet,
          nextEra: Era.Village,
          daysToNextEra: 34,
          trees: [tree, { ...tree, id: 1 }],
          animals: [{ id: 0, species: 'sheep' }],
          buildings: [
            { id: 0, kind: BuildingKind.Cabin },
            { id: 1, kind: BuildingKind.Well },
          ],
        }),
        ecosystem({
          project: 'scratch',
          tendedDays: 1,
          daysToNextEra: 2,
          trees: [tree],
        }),
      ],
    };

    expect(renderWorld(world)).toBe(
      [
        'Bitgrove · Level 2 · 140 XP (40/200 to level 3)',
        '',
        '🏡 api      Hamlet · 2 trees · 1 animal · 2 buildings · 46 days · 34 to Village',
        '🌱 scratch  Clearing · 1 tree · 1 day · 2 to Grove',
      ].join('\n'),
    );
  });
});

describe('renderGrove', () => {
  test('renders the empty grove message', () => {
    expect(renderGrove({ trees: [], totalTendedDays: 0 })).toBe(
      'Your grove is empty. Work on a project with your coding agent and your first seed will be planted.',
    );
  });

  test('renders the sample grove', () => {
    const grove: Grove = {
      totalTendedDays: 12,
      trees: [
        { project: 'api', tendedDays: 16, stage: Stage.Tree },
        { project: 'web', tendedDays: 4, stage: Stage.Sapling },
        { project: 'scratch', tendedDays: 0, stage: Stage.Seed },
      ],
    };

    expect(renderGrove(grove)).toBe(
      [
        'Bitgrove · 12 tended days',
        '',
        '🌳 api      16 days · 14 to 🌲',
        '🌿 web       4 days · 3 to 🪴',
        '🌰 scratch   0 days · 1 to 🌱',
      ].join('\n'),
    );
  });

  test('uses the singular for a single tended day', () => {
    const grove: Grove = {
      totalTendedDays: 1,
      trees: [{ project: 'api', tendedDays: 1, stage: Stage.Sprout }],
    };

    expect(renderGrove(grove)).toBe(
      ['Bitgrove · 1 tended day', '', '🌱 api  1 day · 2 to 🌿'].join('\n'),
    );
  });
});

describe('renderOvernight', () => {
  test('renders stage changes and plain growth', () => {
    const report: OvernightReport = {
      day: '2024-05-09',
      growth: [
        {
          project: 'api',
          tendedDaysBefore: 0,
          tendedDaysAfter: 1,
          stageBefore: Stage.Seed,
          stageAfter: Stage.Sprout,
          stageChanged: true,
        },
        {
          project: 'web',
          tendedDaysBefore: 4,
          tendedDaysAfter: 5,
          stageBefore: Stage.Sapling,
          stageAfter: Stage.Sapling,
          stageChanged: false,
        },
      ],
    };

    expect(renderOvernight(report)).toBe(
      [
        '🌙 While you rested, your grove grew:',
        '  🌰 → 🌱 api',
        '  🌿 web (+1 tended day)',
      ].join('\n'),
    );
  });
});

describe('renderBedtime', () => {
  test('renders the bedtime line', () => {
    expect(renderBedtime()).toBe(
      '🌙 The grove is asleep for today. Nothing grows after hours, so this is a good moment to stop. See you tomorrow.',
    );
  });
});
