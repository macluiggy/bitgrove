const THEME_KEY = 'bitgrove.theme';

// Browser storage can be missing or blocked: the page works without it.
export function loadThemeId(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function saveThemeId(id: string): void {
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // Not remembering the theme is fine.
  }
}
