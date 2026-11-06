import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RulesStore } from '../application';
import { DEFAULT_RULES, type GroveRules } from '../domain';

const MIN_HOUR = 0;
const MAX_HOUR = 23;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hourOrFallback(value: unknown, fallback: number): number {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_HOUR &&
    value <= MAX_HOUR
  ) {
    return value;
  }

  return fallback;
}

export class JsonRulesStore implements RulesStore {
  constructor(private readonly filePath: string) {}

  load(): GroveRules {
    let contents: string;

    try {
      contents = readFileSync(this.filePath, 'utf8');
    } catch {
      return DEFAULT_RULES;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch {
      return DEFAULT_RULES;
    }

    if (!isRecord(parsed)) {
      return DEFAULT_RULES;
    }

    return {
      endHour: hourOrFallback(parsed.endHour, DEFAULT_RULES.endHour),
      dayBoundaryHour: hourOrFallback(
        parsed.dayBoundaryHour,
        DEFAULT_RULES.dayBoundaryHour,
      ),
    };
  }

  save(rules: GroveRules): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(rules, null, 2)}\n`);
  }
}
