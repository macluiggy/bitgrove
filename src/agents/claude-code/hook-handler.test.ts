import { describe, expect, test } from 'bun:test';
import type {
  Clock,
  Deps,
  EventStore,
  LocalNow,
  RulesStore,
} from '../../application';
import {
  DEFAULT_RULES,
  EVENT_SCHEMA_VERSION,
  EventType,
  type EventType as EventTypeValue,
  type GroveEvent,
  type GroveRules,
} from '../../domain';
import { handleClaudeHook } from './hook-handler';

interface FakeEventStore extends EventStore {
  readonly events: GroveEvent[];
}

function createEventStore(initial: GroveEvent[] = []): FakeEventStore {
  const events = [...initial];

  return {
    events,
    readAll: () => [...events],
    append: (event) => {
      events.push(event);
    },
  };
}

function createRulesStore(rules: GroveRules = DEFAULT_RULES): RulesStore {
  let current = rules;

  return {
    load: () => current,
    save: (next) => {
      current = next;
    },
  };
}

function createClock(now: LocalNow): Clock {
  return { now: () => now };
}

interface FakeDeps {
  deps: Deps;
  events: FakeEventStore;
}

function createDeps(now: LocalNow, initialEvents: GroveEvent[] = []): FakeDeps {
  const events = createEventStore(initialEvents);

  return {
    deps: {
      events,
      rules: createRulesStore(),
      clock: createClock(now),
    },
    events,
  };
}

function makeEvent(
  type: EventTypeValue,
  day: string,
  project = 'alpha',
): GroveEvent {
  return {
    v: EVENT_SCHEMA_VERSION,
    type,
    at: `${day}T12:00:00.000Z`,
    day,
    hour: 12,
    project,
    agent: 'claude-code',
  };
}

const noon: LocalNow = {
  instant: '2024-05-10T12:00:00.000Z',
  localDate: '2024-05-10',
  localHour: 12,
};

const night: LocalNow = {
  instant: '2024-05-10T20:00:00.000Z',
  localDate: '2024-05-10',
  localHour: 20,
};

describe('handleClaudeHook', () => {
  test('records a commit from a Bash PostToolUse payload', () => {
    const { deps, events } = createDeps(noon);

    const output = handleClaudeHook(
      {
        session_id: 'session-1',
        transcript_path: '/tmp/transcript.jsonl',
        cwd: '/work/my-api',
        hook_event_name: 'PostToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'git add . && git commit -m "x"' },
        tool_response: {
          stdout: '[main 1a2b3c4] x\n 1 file changed\n',
          stderr: '',
          interrupted: false,
          isImage: false,
        },
      },
      deps,
    );

    expect(output).toBeUndefined();
    expect(events.events).toHaveLength(1);
    expect(events.events[0]?.type).toBe(EventType.CommitMade);
    expect(events.events[0]?.project).toBe('my-api');
    expect(events.events[0]?.agent).toBe('claude-code');
  });

  test('records a passing test run from a Bash PostToolUse payload', () => {
    const { deps, events } = createDeps(noon);

    handleClaudeHook(
      {
        cwd: '/work/my-api',
        hook_event_name: 'PostToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'bun test' },
        tool_response: {
          stdout: ' 12 pass\n 0 fail\n',
          stderr: '',
          interrupted: false,
        },
      },
      deps,
    );

    expect(events.events.map((event) => event.type)).toEqual([
      EventType.TestsPassed,
    ]);
  });

  test('ignores non-Bash tools', () => {
    const { deps, events } = createDeps(noon);

    const output = handleClaudeHook(
      {
        cwd: '/work/my-api',
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: '/work/my-api/src/a.ts' },
      },
      deps,
    );

    expect(output).toBeUndefined();
    expect(events.events).toEqual([]);
  });

  test('ignores Stop while a stop hook is already active', () => {
    const { deps, events } = createDeps(night);

    const output = handleClaudeHook(
      {
        cwd: '/work/my-api',
        hook_event_name: 'Stop',
        stop_hook_active: true,
      },
      deps,
    );

    expect(output).toBeUndefined();
    expect(events.events).toEqual([]);
  });

  test('shows a bedtime line on the first Stop after hours', () => {
    const { deps } = createDeps(night);

    const first = handleClaudeHook(
      { cwd: '/work/my-api', hook_event_name: 'Stop', stop_hook_active: false },
      deps,
    );
    const second = handleClaudeHook(
      { cwd: '/work/my-api', hook_event_name: 'Stop', stop_hook_active: false },
      deps,
    );

    expect(typeof first?.systemMessage).toBe('string');
    expect(second).toBeUndefined();
  });

  test('reports overnight growth on SessionStart', () => {
    const { deps } = createDeps(noon, [
      makeEvent(EventType.TestsPassed, '2024-05-09'),
    ]);

    const output = handleClaudeHook(
      {
        cwd: '/work/alpha',
        hook_event_name: 'SessionStart',
        source: 'startup',
      },
      deps,
    );

    expect(output?.systemMessage).toContain('alpha');
  });

  test('returns undefined for garbage input', () => {
    const { deps } = createDeps(noon);

    expect(handleClaudeHook('not json', deps)).toBeUndefined();
    expect(handleClaudeHook({}, deps)).toBeUndefined();
    expect(
      handleClaudeHook({ hook_event_name: 'PostToolUse' }, deps),
    ).toBeUndefined();
    expect(
      handleClaudeHook(
        { cwd: '/work/alpha', hook_event_name: 'Unknown' },
        deps,
      ),
    ).toBeUndefined();
  });
});
