import {
  EventType,
  type GroveEvent,
  type GroveRules,
} from '../../../src/domain';
import type { GroveData, GroveSource } from './grove-source';

// Must match DATA_PLACEHOLDER in src/cli/view-page.ts.
export const EMBEDDED_DATA_ELEMENT_ID = 'bitgrove-data';

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set(
  Object.values(EventType),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGroveEvent(value: unknown): value is GroveEvent {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    KNOWN_EVENT_TYPES.has(value.type) &&
    typeof value.at === 'string' &&
    typeof value.day === 'string' &&
    typeof value.hour === 'number' &&
    typeof value.project === 'string' &&
    typeof value.agent === 'string'
  );
}

function isGroveRules(value: unknown): value is GroveRules {
  return (
    isRecord(value) &&
    typeof value.endHour === 'number' &&
    typeof value.dayBoundaryHour === 'number'
  );
}

export function parseGroveData(text: string | null): GroveData | undefined {
  if (text === null) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.events) ||
    !isGroveRules(parsed.rules) ||
    typeof parsed.generatedAt !== 'string'
  ) {
    return undefined;
  }

  return {
    events: parsed.events.filter(isGroveEvent),
    rules: parsed.rules,
    generatedAt: parsed.generatedAt,
  };
}

/** Reads the data `bitgrove view` embeds in the page: works offline. */
export class EmbeddedGroveSource implements GroveSource {
  constructor(private readonly doc: Document) {}

  load(): Promise<GroveData | undefined> {
    const element = this.doc.getElementById(EMBEDDED_DATA_ELEMENT_ID);
    return Promise.resolve(parseGroveData(element?.textContent ?? null));
  }
}
