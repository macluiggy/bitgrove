import { describe, expect, test } from 'bun:test';
import { DEFAULT_THEME_ID, getTheme, THEMES, ThemeId } from './index';

describe('themes', () => {
  test('every theme has a unique id, a name and a scene', () => {
    const ids = THEMES.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of THEMES) {
      expect(theme.name.length).toBeGreaterThan(0);
      expect(typeof theme.Scene).toBe('function');
    }
  });

  test('picks a theme by id', () => {
    expect(getTheme(ThemeId.Terminal).id).toBe(ThemeId.Terminal);
  });

  test('falls back to the default theme for an unknown or missing id', () => {
    expect(getTheme('no-such-theme').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(null).id).toBe(DEFAULT_THEME_ID);
  });
});
