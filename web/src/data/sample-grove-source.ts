import {
  DEFAULT_RULES,
  EVENT_SCHEMA_VERSION,
  EventType,
  type GroveEvent,
} from '../../../src/domain';
import type { GroveData, GroveSource } from './grove-source';

// Days tended per sample project: one tree per growth stage.
const SAMPLE_PROJECTS: readonly [string, number][] = [
  ['ancient-api', 31],
  ['billing', 16],
  ['web', 8],
  ['mobile', 4],
  ['docs', 1],
  ['scratch', 0],
];

const SAMPLE_START_DAY_UTC = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

function sampleEvents(): GroveEvent[] {
  return SAMPLE_PROJECTS.flatMap(([project, days]) => {
    const tended = Array.from({ length: days }, (_, index) => {
      const day = new Date(SAMPLE_START_DAY_UTC + index * DAY_MS)
        .toISOString()
        .slice(0, 10);
      return { type: EventType.TestsPassed, day };
    });
    const visits =
      days === 0 ? [{ type: EventType.SessionStarted, day: '2024-01-01' }] : [];

    return [...tended, ...visits].map(({ type, day }) => ({
      v: EVENT_SCHEMA_VERSION,
      type,
      at: `${day}T12:00:00.000Z`,
      day,
      hour: 12,
      project,
      agent: 'claude-code',
    }));
  });
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
