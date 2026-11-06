import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_RULES,
  EVENT_SCHEMA_VERSION,
  EventType,
} from '../../../src/domain';
import { parseGroveData } from './embedded-grove-source';
import type { GroveData } from './grove-source';

const valid = {
  events: [
    {
      v: EVENT_SCHEMA_VERSION,
      type: EventType.TestsPassed,
      at: '2024-05-08T12:00:00.000Z',
      day: '2024-05-08',
      hour: 12,
      project: 'api',
      agent: 'claude-code',
    },
  ],
  rules: DEFAULT_RULES,
  generatedAt: '2024-05-10T12:00:00.000Z',
} satisfies GroveData;

describe('parseGroveData', () => {
  test('reads the data the CLI embeds in the page', () => {
    expect(parseGroveData(JSON.stringify(valid))).toEqual(valid);
  });

  test('returns undefined when nothing was embedded', () => {
    expect(parseGroveData('null')).toBeUndefined();
    expect(parseGroveData(null)).toBeUndefined();
  });

  test('returns undefined for malformed data', () => {
    expect(parseGroveData('{not json')).toBeUndefined();
    expect(parseGroveData(JSON.stringify({ events: 'x' }))).toBeUndefined();
  });
});
