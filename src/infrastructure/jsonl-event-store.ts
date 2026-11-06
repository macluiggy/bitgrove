import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EventStore } from '../application';
import { EVENT_SCHEMA_VERSION, EventType, type GroveEvent } from '../domain';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set(
  Object.values(EventType),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownEventType(value: unknown): value is EventType {
  return typeof value === 'string' && KNOWN_EVENT_TYPES.has(value);
}

function isEventDay(value: unknown): value is string {
  return typeof value === 'string' && DATE_PATTERN.test(value);
}

function isEventHour(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 23
  );
}

function toEvent(value: unknown): GroveEvent | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.v !== EVENT_SCHEMA_VERSION) {
    return undefined;
  }

  if (!isKnownEventType(value.type)) {
    return undefined;
  }

  if (
    !isEventDay(value.day) ||
    !isEventHour(value.hour) ||
    typeof value.project !== 'string' ||
    typeof value.agent !== 'string' ||
    typeof value.at !== 'string'
  ) {
    return undefined;
  }

  return {
    v: EVENT_SCHEMA_VERSION,
    type: value.type,
    at: value.at,
    day: value.day,
    hour: value.hour,
    project: value.project,
    agent: value.agent,
  };
}

export class JsonlEventStore implements EventStore {
  constructor(private readonly filePath: string) {}

  readAll(): GroveEvent[] {
    let contents: string;

    try {
      contents = readFileSync(this.filePath, 'utf8');
    } catch {
      return [];
    }

    const events: GroveEvent[] = [];

    for (const line of contents.split('\n')) {
      if (line.trim() === '') {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      const event = toEvent(parsed);
      if (event !== undefined) {
        events.push(event);
      }
    }

    return events;
  }

  append(event: GroveEvent): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`);
  }
}
