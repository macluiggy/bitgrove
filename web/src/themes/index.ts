import { meadowTheme } from './meadow';
import { terminalTheme } from './terminal';
import { type Theme, ThemeId } from './theme';

export { type Theme, ThemeId } from './theme';

// Add a theme here and it shows up in the picker: nothing else changes.
export const THEMES: readonly Theme[] = [meadowTheme, terminalTheme];

export const DEFAULT_THEME_ID: ThemeId = ThemeId.Meadow;

export function getTheme(id: string | null): Theme {
  return (
    THEMES.find((theme) => theme.id === id) ??
    THEMES.find((theme) => theme.id === DEFAULT_THEME_ID) ??
    meadowTheme
  );
}
