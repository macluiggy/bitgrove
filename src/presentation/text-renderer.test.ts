import { describe, expect, test } from 'bun:test';
import type { OvernightReport } from '../application';
import { type Grove, Stage } from '../domain';
import { renderBedtime, renderGrove, renderOvernight } from './text-renderer';

describe('renderGrove', () => {
  test('renders the empty grove message', () => {
    expect(renderGrove({ trees: [], totalTendedDays: 0 })).toBe(
      'Your grove is empty. Work on a project with your coding agent and your first seed will be planted.',
    );
  });

  test('renders the sample grove', () => {
    const grove: Grove = {
      totalTendedDays: 12,
      trees: [
        { project: 'api', tendedDays: 16, stage: Stage.Tree },
        { project: 'web', tendedDays: 4, stage: Stage.Sapling },
        { project: 'scratch', tendedDays: 0, stage: Stage.Seed },
      ],
    };

    expect(renderGrove(grove)).toBe(
      [
        'Bitgrove · 12 tended days',
        '',
        '🌳 api      16 days · 14 to 🌲',
        '🌿 web       4 days · 3 to 🪴',
        '🌰 scratch   0 days · 1 to 🌱',
      ].join('\n'),
    );
  });

  test('uses the singular for a single tended day', () => {
    const grove: Grove = {
      totalTendedDays: 1,
      trees: [{ project: 'api', tendedDays: 1, stage: Stage.Sprout }],
    };

    expect(renderGrove(grove)).toBe(
      ['Bitgrove · 1 tended day', '', '🌱 api  1 day · 2 to 🌿'].join('\n'),
    );
  });
});

describe('renderOvernight', () => {
  test('renders stage changes and plain growth', () => {
    const report: OvernightReport = {
      day: '2024-05-09',
      growth: [
        {
          project: 'api',
          tendedDaysBefore: 0,
          tendedDaysAfter: 1,
          stageBefore: Stage.Seed,
          stageAfter: Stage.Sprout,
          stageChanged: true,
        },
        {
          project: 'web',
          tendedDaysBefore: 4,
          tendedDaysAfter: 5,
          stageBefore: Stage.Sapling,
          stageAfter: Stage.Sapling,
          stageChanged: false,
        },
      ],
    };

    expect(renderOvernight(report)).toBe(
      [
        '🌙 While you rested, your grove grew:',
        '  🌰 → 🌱 api',
        '  🌿 web (+1 tended day)',
      ].join('\n'),
    );
  });
});

describe('renderBedtime', () => {
  test('renders the bedtime line', () => {
    expect(renderBedtime()).toBe(
      '🌙 The grove is asleep for today. Nothing grows after hours, so this is a good moment to stop. See you tomorrow.',
    );
  });
});
