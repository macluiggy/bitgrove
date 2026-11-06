import { describe, expect, test } from 'bun:test';
import { DEFAULT_RULES, isAfterHours } from './rules';

describe('isAfterHours', () => {
  test('is false during work hours', () => {
    expect(isAfterHours(18, DEFAULT_RULES)).toBe(false);
  });

  test('is true at and after the end hour', () => {
    expect(isAfterHours(19, DEFAULT_RULES)).toBe(true);
    expect(isAfterHours(23, DEFAULT_RULES)).toBe(true);
  });

  test('is true before the day boundary', () => {
    expect(isAfterHours(3, DEFAULT_RULES)).toBe(true);
  });

  test('is false at the day boundary', () => {
    expect(isAfterHours(4, DEFAULT_RULES)).toBe(false);
  });

  test('respects custom rules', () => {
    const rules = { endHour: 22, dayBoundaryHour: 6 };
    expect(isAfterHours(21, rules)).toBe(false);
    expect(isAfterHours(22, rules)).toBe(true);
    expect(isAfterHours(5, rules)).toBe(true);
    expect(isAfterHours(6, rules)).toBe(false);
  });
});
