import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EVENT_SCHEMA_VERSION, EventType, type GroveEvent } from '../domain';
import { JsonlEventStore } from './jsonl-event-store';

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'bitgrove-'));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

function makeEvent(project: string, day: string): GroveEvent {
  return {
    v: EVENT_SCHEMA_VERSION,
    type: EventType.CommitMade,
    at: `${day}T12:00:00.000Z`,
    day,
    hour: 12,
    project,
    agent: 'claude-code',
  };
}

describe('JsonlEventStore', () => {
  test('roundtrips appended events and creates parent directories', () => {
    const filePath = join(directory, 'nested', 'events.jsonl');
    const store = new JsonlEventStore(filePath);
    const first = makeEvent('alpha', '2024-05-01');
    const second = makeEvent('beta', '2024-05-02');

    store.append(first);
    store.append(second);

    expect(store.readAll()).toEqual([first, second]);
  });

  test('returns an empty list when the file is missing', () => {
    const store = new JsonlEventStore(join(directory, 'missing.jsonl'));

    expect(store.readAll()).toEqual([]);
  });

  test('skips blank, malformed, and unknown lines while keeping valid ones', () => {
    const filePath = join(directory, 'events.jsonl');
    const valid = makeEvent('alpha', '2024-05-01');
    const lines = [
      '',
      '   ',
      '{',
      'null',
      '[]',
      JSON.stringify({ ...valid, v: EVENT_SCHEMA_VERSION + 1 }),
      JSON.stringify({ ...valid, type: 'unknown.type' }),
      JSON.stringify({ ...valid, day: '2024/05/01' }),
      JSON.stringify({ ...valid, hour: 24 }),
      JSON.stringify({ ...valid, hour: 1.5 }),
      JSON.stringify({ ...valid, project: 42 }),
      JSON.stringify(valid),
    ];

    writeFileSync(filePath, `${lines.join('\n')}\n`);

    expect(new JsonlEventStore(filePath).readAll()).toEqual([valid]);
  });
});
