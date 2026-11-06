import {
  DEFAULT_RULES,
  EVENT_SCHEMA_VERSION,
  EventType,
  type EventType as EventTypeValue,
  type GroveEvent,
  WorkKind,
} from '../../../src/domain';
import type { GroveData, GroveSource } from './grove-source';

interface SampleProject {
  name: string;
  /** Day (from the start) when the project first appears. */
  firstDay: number;
  /** How many days it gets tended. */
  tendedDays: number;
  /** Tended every N days, so projects grow at different speeds. */
  every: number;
}

// Projects that start at different times and grow at different speeds, so
// the time-travel bar shows clearings appearing, filling up and, for the
// oldest, turning into a hamlet and a village.
const SAMPLE_PROJECTS: readonly SampleProject[] = [
  { name: 'ancient-api', firstDay: 0, tendedDays: 95, every: 1 },
  { name: 'billing', firstDay: 6, tendedDays: 50, every: 1 },
  { name: 'web', firstDay: 15, tendedDays: 26, every: 2 },
  { name: 'mobile', firstDay: 40, tendedDays: 11, every: 3 },
  { name: 'docs', firstDay: 70, tendedDays: 4, every: 4 },
  { name: 'scratch', firstDay: 90, tendedDays: 0, every: 1 },
];

// A realistic mix of work, cycled through each project's days.
const WORK_CYCLE: readonly WorkKind[] = [
  WorkKind.Feature,
  WorkKind.Tests,
  WorkKind.Fix,
  WorkKind.Feature,
  WorkKind.Refactor,
  WorkKind.Tests,
  WorkKind.Docs,
  WorkKind.Chore,
];

const SAMPLE_START_DAY_UTC = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

function dayAt(offset: number): string {
  return new Date(SAMPLE_START_DAY_UTC + offset * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function sampleEvent(
  type: EventTypeValue,
  offset: number,
  project: string,
  work?: WorkKind,
): GroveEvent {
  const day = dayAt(offset);

  return {
    v: EVENT_SCHEMA_VERSION,
    type,
    at: `${day}T12:00:00.000Z`,
    day,
    hour: 12,
    project,
    agent: 'claude-code',
    ...(work === undefined ? {} : { work }),
  };
}

function workOnDay(index: number): WorkKind {
  return WORK_CYCLE[index % WORK_CYCLE.length] ?? WorkKind.Feature;
}

function sampleEvents(): GroveEvent[] {
  return SAMPLE_PROJECTS.flatMap((project) => [
    sampleEvent(EventType.SessionStarted, project.firstDay, project.name),
    ...Array.from({ length: project.tendedDays }, (_, index) =>
      sampleEvent(
        EventType.CommitMade,
        project.firstDay + index * project.every,
        project.name,
        workOnDay(index),
      ),
    ),
  ]);
}

/** Demo data for `bun run dev:web`, so themes can be designed without a save. */
export class SampleGroveSource implements GroveSource {
  load(): Promise<GroveData> {
    return Promise.resolve({
      events: sampleEvents(),
      rules: DEFAULT_RULES,
      generatedAt: new Date(SAMPLE_START_DAY_UTC).toISOString(),
    });
  }
}
