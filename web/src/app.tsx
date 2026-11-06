import { useEffect, useMemo, useState } from 'preact/hooks';
import type { GroveData, GroveSource } from './data/grove-source';
import { loadThemeId, saveThemeId } from './preferences';
import { getTheme, THEMES } from './themes';
import { toGroveView } from './view-model/grove-view';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: GroveData }
  | { status: 'missing' };

export function App({ source }: { source: GroveSource }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [themeId, setThemeId] = useState(loadThemeId);
  const theme = getTheme(themeId);

  useEffect(() => {
    source
      .load()
      .then((data) =>
        setState(
          data === undefined
            ? { status: 'missing' }
            : { status: 'ready', data },
        ),
      )
      .catch(() => setState({ status: 'missing' }));
  }, [source]);

  const grove = useMemo(
    () =>
      state.status === 'ready'
        ? toGroveView(state.data.events, state.data.rules)
        : undefined,
    [state],
  );

  function chooseTheme(id: string) {
    setThemeId(id);
    saveThemeId(id);
  }

  return (
    <main class={`app theme-${theme.id}`}>
      <header class="app-header">
        <h1>
          Bitgrove
          {grove !== undefined && (
            <small>
              {' '}
              · {grove.totalTendedDays}{' '}
              {grove.totalTendedDays === 1 ? 'tended day' : 'tended days'}
            </small>
          )}
        </h1>
        <label class="theme-picker">
          Theme{' '}
          <select
            value={theme.id}
            onChange={(event) => chooseTheme(event.currentTarget.value)}
          >
            {THEMES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {state.status === 'loading' && (
        <p class="app-note">Loading your grove…</p>
      )}
      {state.status === 'missing' && (
        <p class="app-note">
          No grove data here. Open this page with <code>bitgrove view</code>.
        </p>
      )}
      {grove !== undefined && <theme.Scene grove={grove} />}
    </main>
  );
}
