import { describe, expect, test } from 'bun:test';
import { DEFAULT_RULES } from '../domain';
import { DATA_PLACEHOLDER, renderViewPage } from './view-page';

const template = `<html><body><div id="app"></div>${DATA_PLACEHOLDER}</body></html>`;

describe('renderViewPage', () => {
  test('embeds the grove data in the page', () => {
    const html = renderViewPage(template, {
      events: [],
      rules: DEFAULT_RULES,
      generatedAt: '2024-05-10T12:00:00.000Z',
    });

    expect(html).not.toContain(DATA_PLACEHOLDER);
    expect(html).toContain('"generatedAt":"2024-05-10T12:00:00.000Z"');
  });

  test('a project name can never close the script tag', () => {
    const html = renderViewPage(template, {
      events: [
        {
          v: 1,
          type: 'tests.passed',
          at: '2024-05-08T12:00:00.000Z',
          day: '2024-05-08',
          hour: 12,
          project: '</script><script>alert(1)</script>',
          agent: 'claude-code',
        },
      ],
      rules: DEFAULT_RULES,
      generatedAt: '2024-05-10T12:00:00.000Z',
    });

    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });

  test('fails loudly when the page has no data slot', () => {
    expect(() =>
      renderViewPage('<html></html>', {
        events: [],
        rules: DEFAULT_RULES,
        generatedAt: '2024-05-10T12:00:00.000Z',
      }),
    ).toThrow();
  });
});
