import { describe, expect, test } from 'bun:test';
import { gameDayOf, previousDate } from './calendar';

describe('previousDate', () => {
  test('moves to the previous day inside the same month', () => {
    expect(previousDate('2024-05-10')).toBe('2024-05-09');
    expect(previousDate('2024-12-31')).toBe('2024-12-30');
  });

  test('handles month ends with 31 and 30 days', () => {
    expect(previousDate('2024-05-01')).toBe('2024-04-30');
    expect(previousDate('2024-08-01')).toBe('2024-07-31');
  });

  test('handles year end', () => {
    expect(previousDate('2024-01-01')).toBe('2023-12-31');
  });

  test('handles February in leap and common years', () => {
    expect(previousDate('2024-03-01')).toBe('2024-02-29');
    expect(previousDate('2023-03-01')).toBe('2023-02-28');
    expect(previousDate('2024-02-29')).toBe('2024-02-28');
  });

  test('applies the century leap-year rule', () => {
    expect(previousDate('1900-03-01')).toBe('1900-02-28');
    expect(previousDate('2000-03-01')).toBe('2000-02-29');
  });

  test('throws on malformed input', () => {
    const malformed = [
      '',
      'not-a-date',
      '2024-1-01',
      '2024/01/01',
      '2024-13-01',
      '2024-00-01',
      '2024-02-30',
      '2023-02-29',
      '2024-04-31',
      '0000-01-01',
    ];

    for (const date of malformed) {
      expect(() => previousDate(date)).toThrow();
    }
  });
});

describe('gameDayOf', () => {
  test('uses the previous date before the day boundary', () => {
    expect(gameDayOf('2024-05-10', 3, 4)).toBe('2024-05-09');
    expect(gameDayOf('2024-05-10', 0, 4)).toBe('2024-05-09');
  });

  test('uses the local date at or after the day boundary', () => {
    expect(gameDayOf('2024-05-10', 4, 4)).toBe('2024-05-10');
    expect(gameDayOf('2024-05-10', 23, 4)).toBe('2024-05-10');
  });

  test('crosses year end when before the boundary', () => {
    expect(gameDayOf('2024-01-01', 2, 4)).toBe('2023-12-31');
  });

  test('throws on malformed input', () => {
    expect(() => gameDayOf('2024-02-30', 12, 4)).toThrow();
  });
});
