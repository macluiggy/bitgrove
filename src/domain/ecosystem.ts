import type { GroveEvent } from './event';
import { type GroveRules, isAfterHours } from './rules';
import { pickFor } from './seed';
import { Stage } from './stage';
import { WorkKind, workOf } from './work';
import { type LevelProgress, levelFor, xpLedger } from './xp';

/**
 * A project's living ecosystem, grown day by day from its history. Pure and
 * deterministic: the same events always grow the same ecosystem, so new rules
 * replay every save. Themes only paint it.
 */

export const Era = {
  Clearing: 'clearing',
  Grove: 'grove',
  Wood: 'wood',
  Forest: 'forest',
  Hamlet: 'hamlet',
  Village: 'village',
} as const;

export type Era = (typeof Era)[keyof typeof Era];

export const ERA_THRESHOLDS: readonly { era: Era; minTendedDays: number }[] = [
  { era: Era.Clearing, minTendedDays: 0 },
  { era: Era.Grove, minTendedDays: 3 },
  { era: Era.Wood, minTendedDays: 10 },
  { era: Era.Forest, minTendedDays: 25 },
  { era: Era.Hamlet, minTendedDays: 45 },
  { era: Era.Village, minTendedDays: 80 },
];

export const TreeSpecies = {
  Pine: 'pine',
  Oak: 'oak',
  Maple: 'maple',
  Larch: 'larch',
} as const;

export type TreeSpecies = (typeof TreeSpecies)[keyof typeof TreeSpecies];

export const AnimalSpecies = {
  Chicken: 'chicken',
  Sheep: 'sheep',
  Cow: 'cow',
} as const;

export type AnimalSpecies = (typeof AnimalSpecies)[keyof typeof AnimalSpecies];

export const BuildingKind = {
  Cabin: 'cabin',
  Well: 'well',
  House: 'house',
} as const;

export type BuildingKind = (typeof BuildingKind)[keyof typeof BuildingKind];

export interface EcoTree {
  id: number;
  species: TreeSpecies;
  /** Tended days lived (refactors add a little extra). */
  age: number;
  stage: Stage;
}

export interface EcoAnimal {
  id: number;
  species: AnimalSpecies;
}

export interface Building {
  id: number;
  kind: BuildingKind;
}

export interface Ecosystem {
  project: string;
  tendedDays: number;
  era: Era;
  nextEra: Era | undefined;
  daysToNextEra: number | undefined;
  trees: EcoTree[];
  animals: EcoAnimal[];
  flowers: number;
  bushes: number;
  paths: number;
  buildings: Building[];
  xp: number;
}

export interface World {
  ecosystems: Ecosystem[];
  totalXp: number;
  level: LevelProgress;
}

// Tree age (in tended days) at which each stage starts.
const TREE_STAGE_AGES: readonly { stage: Stage; minAge: number }[] = [
  { stage: Stage.Sprout, minAge: 0 },
  { stage: Stage.Sapling, minAge: 2 },
  { stage: Stage.YoungTree, minAge: 5 },
  { stage: Stage.Tree, minAge: 12 },
  { stage: Stage.Ancient, minAge: 30 },
];

const ANCIENT_AGE = 30;
const REFACTOR_BOOST_DAYS = 3;
const FLOWERS_PER_FIX = 2;

// Bounds keep every ecosystem drawable, however long the history (S6).
const MAX_TREES = 36;
const MAX_ANIMALS = 16;
const MAX_FLOWERS = 40;
const MAX_BUSHES = 20;
const MAX_PATHS = 20;
const MAX_HOUSES = 6;
const DAYS_PER_HOUSE = 15;

const TREE_SPECIES: readonly TreeSpecies[] = Object.values(TreeSpecies);
const ANIMAL_SPECIES: readonly AnimalSpecies[] = Object.values(AnimalSpecies);

// Work of the same day is applied in this order, so results never depend on
// the order events were written in.
const WORK_ORDER: readonly WorkKind[] = [
  WorkKind.Feature,
  WorkKind.Refactor,
  WorkKind.Fix,
  WorkKind.Tests,
  WorkKind.Docs,
  WorkKind.Chore,
];

function treeStageFor(age: number): Stage {
  let stage: Stage = Stage.Sprout;
  for (const threshold of TREE_STAGE_AGES) {
    if (age >= threshold.minAge) {
      stage = threshold.stage;
    }
  }
  return stage;
}

function eraIndexFor(tendedDays: number): number {
  let index = 0;
  ERA_THRESHOLDS.forEach((threshold, position) => {
    if (tendedDays >= threshold.minTendedDays) {
      index = position;
    }
  });
  return index;
}

function eraAtLeast(tendedDays: number, era: Era): boolean {
  const target = ERA_THRESHOLDS.findIndex((t) => t.era === era);
  return eraIndexFor(tendedDays) >= target;
}

/** Work kinds per tended day of one project, oldest day first. */
function workByDay(
  project: string,
  events: readonly GroveEvent[],
  rules: GroveRules,
): WorkKind[][] {
  const days = new Map<string, Set<WorkKind>>();

  for (const event of events) {
    const work = workOf(event);
    if (
      event.project !== project ||
      work === undefined ||
      isAfterHours(event.hour, rules)
    ) {
      continue;
    }

    let kinds = days.get(event.day);
    if (kinds === undefined) {
      kinds = new Set<WorkKind>();
      days.set(event.day, kinds);
    }
    kinds.add(work);
  }

  return [...days.keys()]
    .sort()
    .map((day) => WORK_ORDER.filter((kind) => days.get(day)?.has(kind)));
}

interface Growing {
  trees: { id: number; species: TreeSpecies; age: number }[];
  animals: EcoAnimal[];
  flowers: number;
  bushes: number;
  paths: number;
}

function plantTree(project: string, life: Growing): boolean {
  if (life.trees.length >= MAX_TREES) {
    return false;
  }
  const id = life.trees.length;
  life.trees.push({
    id,
    species: pickFor(`${project}:tree:${id}`, TREE_SPECIES),
    age: 0,
  });
  return true;
}

function nurtureYoungest(life: Growing): void {
  const growing = life.trees.filter((tree) => tree.age < ANCIENT_AGE);
  const youngest = growing.at(-1);
  if (youngest !== undefined) {
    youngest.age += REFACTOR_BOOST_DAYS;
  }
}

function applyWork(
  project: string,
  kind: WorkKind,
  life: Growing,
  tendedDays: number,
): void {
  switch (kind) {
    case WorkKind.Feature:
      if (!plantTree(project, life)) {
        nurtureYoungest(life);
      }
      return;
    case WorkKind.Refactor:
      nurtureYoungest(life);
      return;
    case WorkKind.Fix:
      life.flowers = Math.min(MAX_FLOWERS, life.flowers + FLOWERS_PER_FIX);
      return;
    case WorkKind.Tests: {
      const room = Math.min(MAX_ANIMALS, life.trees.length);
      if (eraAtLeast(tendedDays, Era.Grove) && life.animals.length < room) {
        const id = life.animals.length;
        life.animals.push({
          id,
          species: pickFor(`${project}:animal:${id}`, ANIMAL_SPECIES),
        });
      } else {
        life.flowers = Math.min(MAX_FLOWERS, life.flowers + 1);
      }
      return;
    }
    case WorkKind.Docs:
      life.paths = Math.min(MAX_PATHS, life.paths + 1);
      return;
    case WorkKind.Chore:
      life.bushes = Math.min(MAX_BUSHES, life.bushes + 1);
      return;
  }
}

function buildingsFor(tendedDays: number): Building[] {
  const kinds: BuildingKind[] = [];

  if (eraAtLeast(tendedDays, Era.Hamlet)) {
    kinds.push(BuildingKind.Cabin, BuildingKind.Well);
  }

  if (eraAtLeast(tendedDays, Era.Village)) {
    const villageStart =
      ERA_THRESHOLDS.find((t) => t.era === Era.Village)?.minTendedDays ?? 0;
    const houses = Math.min(
      MAX_HOUSES,
      1 + Math.floor((tendedDays - villageStart) / DAYS_PER_HOUSE),
    );
    for (let index = 0; index < houses; index += 1) {
      kinds.push(BuildingKind.House);
    }
  }

  return kinds.map((kind, id) => ({ id, kind }));
}

export function buildEcosystem(
  project: string,
  events: readonly GroveEvent[],
  rules: GroveRules,
): Ecosystem {
  const life: Growing = {
    trees: [],
    animals: [],
    flowers: 0,
    bushes: 0,
    paths: 0,
  };

  const days = workByDay(project, events, rules);

  days.forEach((kinds, index) => {
    const tendedDays = index + 1;

    for (const kind of kinds) {
      applyWork(project, kind, life, tendedDays);
    }

    // The first tended day always plants something, whatever the work.
    if (life.trees.length === 0) {
      plantTree(project, life);
    }

    for (const tree of life.trees) {
      tree.age += 1;
    }
  });

  const tendedDays = days.length;
  const eraIndex = eraIndexFor(tendedDays);
  const next = ERA_THRESHOLDS[eraIndex + 1];

  return {
    project,
    tendedDays,
    era: ERA_THRESHOLDS[eraIndex]?.era ?? Era.Clearing,
    nextEra: next?.era,
    daysToNextEra:
      next === undefined ? undefined : next.minTendedDays - tendedDays,
    trees: life.trees.map((tree) => ({
      ...tree,
      stage: treeStageFor(tree.age),
    })),
    animals: life.animals,
    flowers: life.flowers,
    bushes: life.bushes,
    paths: life.paths,
    buildings: buildingsFor(tendedDays),
    xp: xpLedger(events, rules).byProject.get(project) ?? 0,
  };
}

export function buildWorld(
  events: readonly GroveEvent[],
  rules: GroveRules,
): World {
  const projects = [...new Set(events.map((event) => event.project))];
  const ledger = xpLedger(events, rules);

  const ecosystems = projects
    .map((project) => buildEcosystem(project, events, rules))
    .sort(
      (a, b) =>
        b.tendedDays - a.tendedDays ||
        (a.project < b.project ? -1 : a.project > b.project ? 1 : 0),
    );

  return {
    ecosystems,
    totalXp: ledger.totalXp,
    level: levelFor(ledger.totalXp),
  };
}
