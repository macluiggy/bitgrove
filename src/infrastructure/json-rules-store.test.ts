import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_RULES, type GroveRules } from '../domain';
import { JsonRulesStore } from './json-rules-store';

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'bitgrove-'));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('JsonRulesStore', () => {
  test('returns defaults when the file is missing', () => {
    const store = new JsonRulesStore(join(directory, 'config.json'));

    expect(store.load()).toEqual(DEFAULT_RULES);
  });

  test('returns defaults when the JSON is malformed', () => {
    const filePath = join(directory, 'config.json');
    writeFileSync(filePath, 'not json');

    expect(new JsonRulesStore(filePath).load()).toEqual(DEFAULT_RULES);
  });

  test('falls back per field for out-of-range values', () => {
    const filePath = join(directory, 'config.json');
    const store = new JsonRulesStore(filePath);

    writeFileSync(
      filePath,
      JSON.stringify({ endHour: 22, dayBoundaryHour: 99 }),
    );
    expect(store.load()).toEqual({ endHour: 22, dayBoundaryHour: 4 });

    writeFileSync(
      filePath,
      JSON.stringify({ endHour: -1, dayBoundaryHour: 2 }),
    );
    expect(store.load()).toEqual({ endHour: 19, dayBoundaryHour: 2 });

    writeFileSync(filePath, JSON.stringify([]));
    expect(store.load()).toEqual(DEFAULT_RULES);
  });

  test('saves pretty JSON with a trailing newline and loads it back', () => {
    const filePath = join(directory, 'nested', 'config.json');
    const store = new JsonRulesStore(filePath);
    const rules: GroveRules = { endHour: 21, dayBoundaryHour: 5 };

    store.save(rules);

    expect(store.load()).toEqual(rules);
    expect(readFileSync(filePath, 'utf8')).toBe(
      `${JSON.stringify(rules, null, 2)}\n`,
    );
  });
});
