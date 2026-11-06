import { describe, expect, test } from 'bun:test';
import {
  BuildingKind,
  buildEcosystem,
  buildWorld,
  type Ecosystem,
  Era,
} from './ecosystem';
import { EVENT_SCHEMA_VERSION, EventType, type GroveEvent } from './event';
import { DEFAULT_RULES } from './rules';
import { Stage } from './stage';
import { WorkKind } from './work';

const START_UTC = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

function dayAt(offset: number): string {
  return new Date(START_UTC + offset * DAY_MS).toISOString().slice(0, 10);
}

function done(
  offset: number,
  work: WorkKind,
  { project = 'api', hour = 12 } = {},
): GroveEvent {
  const day = dayAt(offset);
  const base = {
    v: EVENT_SCHEMA_VERSION,
    at: `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    day,
    hour,
    project,
    agent: 'claude-code',
  } as const;

  return work === WorkKind.Tests
    ? { ...base, type: EventType.TestsPassed }
    : { ...base, type: EventType.CommitMade, work };
}

/** `days` tended days in a row, each with the given work. */
function days(count: number, work: WorkKind, from = 0): GroveEvent[] {
  return Array.from({ length: count }, (_, index) => done(from + index, work));
}

function grow(events: GroveEvent[]): Ecosystem {
  return buildEcosystem('api', events, DEFAULT_RULES);
}

describe('buildEcosystem', () => {
  test('a project nobody tended yet is an empty clearing', () => {
    const ecosystem = grow([]);

    expect(ecosystem.era).toBe(Era.Clearing);
    expect(ecosystem.tendedDays).toBe(0);
    expect(ecosystem.trees).toEqual([]);
    expect(ecosystem.animals).toEqual([]);
  });

  test('the first tended day plants the first tree, whatever the work', () => {
    expect(grow([done(0, WorkKind.Docs)]).trees).toHaveLength(1);
  });

  test('each day with a new feature plants another tree', () => {
    expect(grow(days(3, WorkKind.Feature)).trees).toHaveLength(3);
  });

  test('trees grow as the project is tended, up to ancient', () => {
    const [first] = grow(days(31, WorkKind.Chore)).trees;

    expect(first?.stage).toBe(Stage.Ancient);
  });

  test('a refactor helps the youngest growing tree catch up', () => {
    const plain = grow([...days(2, WorkKind.Feature), done(2, WorkKind.Chore)]);
    const refactored = grow([
      ...days(2, WorkKind.Feature),
      done(2, WorkKind.Refactor),
    ]);

    expect(refactored.trees[1]?.age).toBeGreaterThan(plain.trees[1]?.age ?? 0);
  });

  test('fixes make flowers bloom', () => {
    expect(grow(days(3, WorkKind.Fix)).flowers).toBeGreaterThan(
      grow(days(3, WorkKind.Chore)).flowers,
    );
  });

  test('tests bring animals once the clearing has become a grove', () => {
    expect(grow(days(2, WorkKind.Tests)).animals).toEqual([]);

    const grove = grow([
      ...days(4, WorkKind.Feature),
      ...days(4, WorkKind.Tests, 4),
    ]);
    expect(grove.animals.length).toBeGreaterThan(0);
    expect(grove.animals.length).toBeLessThanOrEqual(grove.trees.length);
  });

  test('a long-tended project becomes a hamlet, then a village', () => {
    const hamlet = grow(days(45, WorkKind.Feature));
    expect(hamlet.era).toBe(Era.Hamlet);
    expect(hamlet.buildings.map((b) => b.kind)).toContain(BuildingKind.Cabin);

    const village = grow(days(95, WorkKind.Feature));
    expect(village.era).toBe(Era.Village);
    expect(
      village.buildings.filter((b) => b.kind === BuildingKind.House).length,
    ).toBeGreaterThan(0);
  });

  test('says how many tended days are left to the next era', () => {
    const ecosystem = grow(days(2, WorkKind.Feature));

    expect(ecosystem.nextEra).toBe(Era.Grove);
    expect(ecosystem.daysToNextEra).toBe(1);
  });

  test('nothing ever shrinks as more days are tended (P3)', () => {
    const history = [
      ...days(10, WorkKind.Feature),
      ...days(10, WorkKind.Tests, 10),
      ...days(10, WorkKind.Fix, 20),
      ...days(10, WorkKind.Refactor, 30),
    ];

    let previous = grow([]);
    for (let end = 1; end <= history.length; end += 1) {
      const next = grow(history.slice(0, end));
      expect(next.trees.length).toBeGreaterThanOrEqual(previous.trees.length);
      expect(next.animals.length).toBeGreaterThanOrEqual(
        previous.animals.length,
      );
      expect(next.flowers).toBeGreaterThanOrEqual(previous.flowers);
      expect(next.buildings.length).toBeGreaterThanOrEqual(
        previous.buildings.length,
      );
      previous = next;
    }
  });

  test('work after hours grows nothing (P4)', () => {
    expect(grow([done(0, WorkKind.Feature, { hour: 22 })]).tendedDays).toBe(0);
  });

  test('the same history always grows the same ecosystem', () => {
    const history = [
      ...days(12, WorkKind.Feature),
      ...days(6, WorkKind.Tests, 12),
    ];

    expect(grow(history)).toEqual(grow(history));
  });

  test('stays bounded however long the history', () => {
    const ecosystem = grow(days(400, WorkKind.Feature));

    expect(ecosystem.trees.length).toBeLessThanOrEqual(40);
    expect(ecosystem.buildings.length).toBeLessThanOrEqual(10);
  });
});

describe('buildWorld', () => {
  test('each project grows its own ecosystem, untouched by the others', () => {
    const alone = buildWorld(days(5, WorkKind.Feature), DEFAULT_RULES);
    const shared = buildWorld(
      [
        ...days(5, WorkKind.Feature),
        ...Array.from({ length: 9 }, (_, index) =>
          done(index, WorkKind.Tests, { project: 'web' }),
        ),
      ],
      DEFAULT_RULES,
    );

    expect(shared.ecosystems.find((e) => e.project === 'api')).toEqual(
      alone.ecosystems.find((e) => e.project === 'api'),
    );
  });

  test('lists every project, the busiest first, with XP and level', () => {
    const world = buildWorld(
      [
        ...days(2, WorkKind.Feature),
        ...Array.from({ length: 4 }, (_, index) =>
          done(index, WorkKind.Feature, { project: 'web' }),
        ),
      ],
      DEFAULT_RULES,
    );

    expect(world.ecosystems.map((e) => e.project)).toEqual(['web', 'api']);
    expect(world.ecosystems[0]?.xp).toBeGreaterThan(0);
    expect(world.totalXp).toBeGreaterThan(0);
    expect(world.level.level).toBeGreaterThanOrEqual(1);
  });
});
