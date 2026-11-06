import { useEffect, useState } from 'preact/hooks';

// Development only: scrub through the days to watch the grove grow.
const PLAY_STEP_MS = 350;

interface TimeTravelBarProps {
  days: readonly string[];
  /** Index into `days`; days.length - 1 is the latest day. */
  index: number;
  onChange(index: number): void;
}

export function TimeTravelBar({ days, index, onChange }: TimeTravelBarProps) {
  const [playing, setPlaying] = useState(false);
  const last = days.length - 1;

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (index >= last) {
      setPlaying(false);
      return;
    }

    const timer = setTimeout(() => onChange(index + 1), PLAY_STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, index, last, onChange]);

  if (days.length === 0) {
    return null;
  }

  function togglePlay() {
    if (!playing && index >= last) {
      onChange(0);
    }
    setPlaying(!playing);
  }

  return (
    <section class="time-travel" aria-label="Time travel (development only)">
      <strong>Time travel</strong>
      <button type="button" onClick={togglePlay}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        min={0}
        max={last}
        value={index}
        aria-label="Day"
        onInput={(event) => {
          setPlaying(false);
          onChange(Number(event.currentTarget.value));
        }}
      />
      <span>
        Day {index + 1} of {days.length} · {days[index]}
      </span>
    </section>
  );
}
