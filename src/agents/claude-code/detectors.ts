import { EventType } from '../../domain';

export type DetectedAccomplishment =
  | typeof EventType.TestsPassed
  | typeof EventType.CommitMade;

export interface CommandOutcome {
  command: string;
  stdout: string;
  stderr: string;
  interrupted: boolean;
}

const GIT_COMMIT_PATTERN = /\bgit\b[^;&|\n]*?\bcommit\b(?!-)/;
const COMMIT_REPORT_PATTERN = /^\[[^\]\n]+ [0-9a-f]{7,40}\]/m;
const DRY_RUN_FLAG = '--dry-run';

const FAILURE_PATTERNS: readonly RegExp[] = [
  /\b[1-9]\d*\s+(?:fail|fails|failed|failing|failures?)\b/i,
  /^\s*FAIL\b/m,
  /\btests? failed\b/i,
];

// A runner only counts in command position: at the start of the command or
// after a separator, optionally behind env assignments and a package launcher.
// It must be followed by whitespace or the end, so `jest.config.js` never matches.
const COMMAND_START = String.raw`(?:^|[;&|(])\s*`;
const ENV_ASSIGNMENTS = String.raw`(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*`;
const PACKAGE_LAUNCHER = String.raw`(?:npx\s+|bunx\s+|pnpm\s+(?:exec|dlx)\s+|yarn\s+|python3?\s+-m\s+|\./node_modules/\.bin/)?`;
const TOKEN_END = String.raw`(?=\s|$)`;

const TEST_RUNNERS: readonly string[] = [
  String.raw`bun\s+(?:run\s+)?test`,
  String.raw`npm\s+(?:run\s+)?test`,
  String.raw`pnpm\s+(?:run\s+)?test`,
  String.raw`yarn\s+(?:run\s+)?test`,
  'vitest',
  'jest',
  'pytest',
  String.raw`go\s+test`,
  String.raw`cargo\s+test`,
  String.raw`deno\s+test`,
  String.raw`mvn\s+test`,
  String.raw`(?:\./)?gradlew?\s+test`,
  String.raw`dotnet\s+test`,
  'rspec',
  'phpunit',
  String.raw`mix\s+test`,
];

const TEST_RUNNER_PATTERN = new RegExp(
  `${COMMAND_START}${ENV_ASSIGNMENTS}${PACKAGE_LAUNCHER}(?:${TEST_RUNNERS.join('|')})${TOKEN_END}`,
  'm',
);

function isCommitCommand(command: string): boolean {
  return GIT_COMMIT_PATTERN.test(command) && !command.includes(DRY_RUN_FLAG);
}

function invokesTestRunner(command: string): boolean {
  return TEST_RUNNER_PATTERN.test(command);
}

function hasFailureMarker(output: string): boolean {
  return FAILURE_PATTERNS.some((pattern) => pattern.test(output));
}

export function detectAccomplishment(
  input: CommandOutcome,
): DetectedAccomplishment | undefined {
  if (
    isCommitCommand(input.command) &&
    COMMIT_REPORT_PATTERN.test(input.stdout)
  ) {
    return EventType.CommitMade;
  }

  if (input.interrupted) {
    return undefined;
  }

  if (!invokesTestRunner(input.command)) {
    return undefined;
  }

  if (hasFailureMarker(`${input.stdout}\n${input.stderr}`)) {
    return undefined;
  }

  return EventType.TestsPassed;
}
