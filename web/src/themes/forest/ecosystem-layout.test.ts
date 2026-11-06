import { describe, expect, test } from 'bun:test';
import {
  BuildingKind,
  buildEcosystem,
  DEFAULT_RULES,
  type Ecosystem,
  EVENT_SCHEMA_VERSION,
  EventType,
  type GroveEvent,
  WorkKind,
} from '../../../../src/domain';
import { ItemKind, layoutEcosystem, type PlotLayout } from './ecosystem-layout';

const START_UTC = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

function history(count: number, work: WorkKind, project = 'api'): GroveEvent[] {
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(START_UTC + index * DAY_MS).toISOString().slice(0, 10);
    return {
      v: EVENT_SCHEMA_VERSION,
      type: EventType.CommitMade,
      at: `${day}T12:00:00.000Z`,
      day,
      hour: 12,
      project,
      agent: 'claude-code',
      work,
    };
  });
}

function ecosystemAfter(
  count: number,
  work: WorkKind = WorkKind.Feature,
  project = 'api',
): Ecosystem {
  return buildEcosystem(project, history(count, work, project), DEFAULT_RULES);
}

function cellsOf(layout: PlotLayout): string[] {
  return layout.items.flatMap((item) => {
    const cells: string[] = [];
    for (let dc = 0; dc < item.width; dc += 1) {
      for (let dr = 0; dr < item.height; dr += 1) {
        cells.push(`${item.col + dc},${item.row + dr}`);
      }
    }
    return cells;
  });
}

function itemsOf(layout: PlotLayout, kind: ItemKind) {
  return layout.items.filter((item) => item.kind === kind);
}

describe('layoutEcosystem', () => {
  test('the same ecosystem is always laid out the same way', () => {
    const ecosystem = ecosystemAfter(20);

    expect(layoutEcosystem(ecosystem)).toEqual(layoutEcosystem(ecosystem));
  });

  test('nothing overlaps and everything stays inside the plot', () => {
    for (const days of [1, 12, 30, 50, 100]) {
      const layout = layoutEcosystem(ecosystemAfter(days));
      const cells = cellsOf(layout);

      expect(new Set(cells).size).toBe(cells.length);
      for (const item of layout.items) {
        expect(item.col).toBeGreaterThanOrEqual(0);
        expect(item.row).toBeGreaterThanOrEqual(0);
        expect(item.col + item.width).toBeLessThanOrEqual(layout.cols);
        expect(item.row + item.height).toBeLessThanOrEqual(layout.rows);
      }
      expect(layout.ground).toHaveLength(layout.cols * layout.rows);
    }
  });

  test('the plot grows with its era', () => {
    const clearing = layoutEcosystem(ecosystemAfter(1));
    const village = layoutEcosystem(ecosystemAfter(90));

    expect(village.cols * village.rows).toBeGreaterThan(
      clearing.cols * clearing.rows,
    );
  });

  test('more trees in the ecosystem means more trees on the plot', () => {
    expect(
      itemsOf(layoutEcosystem(ecosystemAfter(8)), ItemKind.Tree).length,
    ).toBeGreaterThan(
      itemsOf(layoutEcosystem(ecosystemAfter(3)), ItemKind.Tree).length,
    );
  });

  test('every tree of a young ecosystem gets a spot', () => {
    const ecosystem = ecosystemAfter(6);

    expect(itemsOf(layoutEcosystem(ecosystem), ItemKind.Tree)).toHaveLength(
      ecosystem.trees.length,
    );
  });

  test('animals and buildings show up when the ecosystem has them', () => {
    const ecosystem = buildEcosystem(
      'api',
      [
        ...history(46, WorkKind.Feature),
        ...history(60, WorkKind.Tests).slice(46),
      ],
      DEFAULT_RULES,
    );
    const layout = layoutEcosystem(ecosystem);

    expect(ecosystem.animals.length).toBeGreaterThan(0);
    expect(itemsOf(layout, ItemKind.Animal).length).toBeGreaterThan(0);
    expect(
      itemsOf(layout, ItemKind.Building).map((item) => item.building),
    ).toContain(BuildingKind.Cabin);
  });
});
