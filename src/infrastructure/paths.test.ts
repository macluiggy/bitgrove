import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { resolvePaths } from './paths';

describe('resolvePaths', () => {
  test('prefers BITGROVE_HOME over HOME', () => {
    const paths = resolvePaths({
      HOME: '/home/player',
      BITGROVE_HOME: '/custom/save',
    });

    expect(paths.home).toBe('/custom/save');
    expect(paths.eventsFile).toBe(join('/custom/save', 'events.jsonl'));
    expect(paths.configFile).toBe(join('/custom/save', 'config.json'));
    expect(paths.binDir).toBe(join('/custom/save', 'bin'));
  });

  test('falls back to HOME/.bitgrove', () => {
    const paths = resolvePaths({ HOME: '/home/player' });

    expect(paths.home).toBe(join('/home/player', '.bitgrove'));
    expect(paths.eventsFile).toBe(
      join('/home/player', '.bitgrove', 'events.jsonl'),
    );
  });

  test('throws when neither HOME nor BITGROVE_HOME is set', () => {
    expect(() => resolvePaths({})).toThrow(/BITGROVE_HOME or HOME/);
  });
});
