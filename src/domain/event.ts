import type { WorkKind } from './work';

export const EventType = {
  SessionStarted: 'session.started',
  TestsPassed: 'tests.passed',
  CommitMade: 'commit.made',
  OvernightShown: 'overnight.shown',
  BedtimeShown: 'bedtime.shown',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export const ACCOMPLISHMENT_TYPES: readonly EventType[] = [
  EventType.TestsPassed,
  EventType.CommitMade,
];

export const EVENT_SCHEMA_VERSION = 1;

export interface GroveEvent {
  v: typeof EVENT_SCHEMA_VERSION;
  type: EventType;
  at: string;
  day: string;
  hour: number;
  project: string;
  agent: string;
  /**
   * Kind of work of a commit (from its conventional commit type). Optional and
   * additive: events written before it existed stay valid under v1.
   */
  work?: WorkKind;
}

export function isAccomplishment(event: GroveEvent): boolean {
  return ACCOMPLISHMENT_TYPES.includes(event.type);
}
