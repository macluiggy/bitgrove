import type { GroveEvent, GroveRules } from '../../../src/domain';

// The page never knows where events come from: the local CLI today, the cloud
// later. Each origin is an adapter behind this port.
export interface GroveData {
  events: GroveEvent[];
  rules: GroveRules;
  generatedAt: string;
}

export interface GroveSource {
  load(): Promise<GroveData | undefined>;
}
