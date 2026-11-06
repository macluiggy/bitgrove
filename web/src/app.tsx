import { useEffect, useMemo, useState } from 'preact/hooks';
import type { GroveData, GroveSource } from './data/grove-source';
import { eventDays, eventsUntil } from './dev/time-travel';
import { TimeTravelBar } from './dev/time-travel-bar';
import { loadThemeId, saveThemeId } from './preferences';
import { getTheme, THEMES } from './themes';
import { toGroveView } from './view-model/grove-view';

// Vite replaces MODE at build time, so the time-travel bar is removed from the
// page that `bitgrove view` ships.
const TIME_TRAVEL = import.meta.env.MODE === 'development';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: GroveData }
  | { status: 'missing' };

export function App({ source }: { source: GroveSource }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [themeId, setThemeId] = useState(loadThemeId);
  const theme = getTheme(themeId);
  const [dayIndex, setDayIndex] = useState<number | undefined>(undefined);

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

  const days = useMemo(
    () => (state.status === 'ready' ? eventDays(state.data.events) : []),
    [state],
  );
  const shownDayIndex = dayIndex ?? days.length - 1;

  const grove = useMemo(() => {
    if (state.status !== 'ready') {
      return undefined;
    }

    const events = TIME_TRAVEL
      ? eventsUntil(state.data.events, days[shownDayIndex])
      : state.data.events;
    return toGroveView(events, state.data.rules);
  }, [state, days, shownDayIndex]);

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
      {TIME_TRAVEL && grove !== undefined && (
        <TimeTravelBar
          days={days}
          index={shownDayIndex}
          onChange={setDayIndex}
        />
      )}
      {grove !== undefined && <theme.Scene grove={grove} />}
    </main>
  );
}
