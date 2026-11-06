import { useEffect, useMemo, useState } from 'preact/hooks';
import { buildWorld, type World } from '../../src/domain';
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

  const views = useMemo(() => {
    if (state.status !== 'ready') {
      return undefined;
    }

    const events = TIME_TRAVEL
      ? eventsUntil(state.data.events, days[shownDayIndex])
      : state.data.events;
    return {
      grove: toGroveView(events, state.data.rules),
      world: buildWorld(events, state.data.rules),
    };
  }, [state, days, shownDayIndex]);

  function chooseTheme(id: string) {
    setThemeId(id);
    saveThemeId(id);
  }

  return (
    <main class={`app theme-${theme.id}`}>
      <header class="app-header">
        <h1>Bitgrove</h1>
        {views !== undefined && <LevelBadge world={views.world} />}
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
      {TIME_TRAVEL && views !== undefined && (
        <TimeTravelBar
          days={days}
          index={shownDayIndex}
          onChange={setDayIndex}
        />
      )}
      {views !== undefined && (
        <theme.Scene grove={views.grove} world={views.world} />
      )}
    </main>
  );
}

function LevelBadge({ world }: { world: World }) {
  const { level, levelXp, nextLevelXp } = world.level;
  const progress = Math.round((levelXp / nextLevelXp) * 100);

  return (
    <div class="level">
      <strong>Level {level}</strong>
      <div
        class="level-bar"
        role="progressbar"
        aria-label={`XP to level ${level + 1}`}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span class="bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <small>
        {levelXp} / {nextLevelXp} XP · {world.totalXp} total
      </small>
    </div>
  );
}
