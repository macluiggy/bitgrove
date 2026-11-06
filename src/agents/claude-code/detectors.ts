import { EventType } from '../../domain';

// Commits are not detected here: they come from git history (see
// GitCommitLog), which also sees commits made outside the agent.
export type DetectedAccomplishment = typeof EventType.TestsPassed;

export interface CommandOutcome {
  command: string;
  stdout: string;
  stderr: string;
  interrupted: boolean;
}

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

// `test`, or a named test script such as `test:unit`, `test:e2e` or `test-ci`.
const TEST_SCRIPT = String.raw`test(?:[:-][\w:-]*)?`;

const TEST_RUNNERS: readonly string[] = [
  String.raw`bun\s+(?:run\s+)?${TEST_SCRIPT}`,
  String.raw`npm\s+(?:run\s+)?${TEST_SCRIPT}`,
  String.raw`pnpm\s+(?:run\s+)?${TEST_SCRIPT}`,
  String.raw`yarn\s+(?:run\s+)?${TEST_SCRIPT}`,
  String.raw`make\s+test`,
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

function invokesTestRunner(command: string): boolean {
  return TEST_RUNNER_PATTERN.test(command);
}

function hasFailureMarker(output: string): boolean {
  return FAILURE_PATTERNS.some((pattern) => pattern.test(output));
}

export function detectAccomplishment(
  input: CommandOutcome,
): DetectedAccomplishment | undefined {
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
