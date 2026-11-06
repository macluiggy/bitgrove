import type { GroveEvent, GroveRules } from '../domain';

export interface EventStore {
  readAll(): GroveEvent[];
  append(event: GroveEvent): void;
}

export interface RulesStore {
  load(): GroveRules;
  save(rules: GroveRules): void;
}

export interface LocalNow {
  instant: string;
  localDate: string;
  localHour: number;
}

export interface Clock {
  now(): LocalNow;
}

export interface Activity {
  project: string;
  agent: string;
}

export interface Deps {
  events: EventStore;
  rules: RulesStore;
  clock: Clock;
}
