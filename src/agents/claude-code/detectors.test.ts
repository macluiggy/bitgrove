import { describe, expect, test } from 'bun:test';
import { EventType } from '../../domain';
import { type DetectedAccomplishment, detectAccomplishment } from './detectors';

interface OutcomeInput {
  command: string;
  stdout?: string;
  stderr?: string;
  interrupted?: boolean;
}

function detect(input: OutcomeInput): DetectedAccomplishment | undefined {
  return detectAccomplishment({
    command: input.command,
    stdout: input.stdout ?? '',
    stderr: input.stderr ?? '',
    interrupted: input.interrupted ?? false,
  });
}

interface TestRunCase {
  name: string;
  input: OutcomeInput;
  expected: DetectedAccomplishment | undefined;
}

const TEST_RUN_CASES: readonly TestRunCase[] = [
  {
    name: 'counts a passing bun test run',
    input: { command: 'bun test', stdout: ' 12 pass\n 0 fail\n' },
    expected: EventType.TestsPassed,
  },
  {
    name: 'counts a passing vitest run',
    input: {
      command: 'npx vitest run',
      stdout: ' Test Files  1 passed (1)\n      Tests  4 passed (4)\n',
    },
    expected: EventType.TestsPassed,
  },
  {
    name: 'counts a passing npm test run',
    input: { command: 'npm test -- --watch=false', stdout: 'ok\n' },
    expected: EventType.TestsPassed,
  },
  {
    name: 'counts a passing go test run',
    input: { command: 'go test ./...', stdout: 'ok  example.com/x  0.2s\n' },
    expected: EventType.TestsPassed,
  },
  {
    name: 'ignores a bun test run with a failure',
    input: { command: 'bun test', stdout: ' 11 pass\n 1 fail\n' },
    expected: undefined,
  },
  {
    name: 'ignores a jest run with FAIL output',
    input: {
      command: 'jest',
      stdout: 'FAIL src/a.test.ts\n  Tests: 1 failed, 3 passed\n',
    },
    expected: undefined,
  },
  {
    name: 'ignores a pytest run with failures',
    input: { command: 'pytest', stdout: '1 failed, 3 passed in 0.4s\n' },
    expected: undefined,
  },
  {
    name: 'ignores an interrupted test run',
    input: {
      command: 'bun test',
      stdout: ' 12 pass\n 0 fail\n',
      interrupted: true,
    },
    expected: undefined,
  },
  {
    name: 'ignores commands that are not test runs',
    input: { command: 'grep test file', stdout: ' 12 pass\n 0 fail\n' },
    expected: undefined,
  },
  {
    name: 'ignores a plain ls command',
    input: { command: 'ls', stdout: 'src\n' },
    expected: undefined,
  },
];

describe('detectAccomplishment test runs', () => {
  for (const testCase of TEST_RUN_CASES) {
    test(testCase.name, () => {
      expect(detect(testCase.input)).toBe(testCase.expected);
    });
  }
});

describe('detectAccomplishment commits', () => {
  test('leaves commits to git history, even when Bash shows a commit', () => {
    expect(
      detect({
        command: 'git add . && git commit -m "x"',
        stdout: '[main 1a2b3c4] x\n',
      }),
    ).toBeUndefined();
  });

  test('still counts the tests when a command also commits', () => {
    expect(
      detect({
        command: 'bun test && git commit -m "x"',
        stdout: ' 12 pass\n 0 fail\n[main 1a2b3c4] x\n',
      }),
    ).toBe(EventType.TestsPassed);
  });
});

describe('detectAccomplishment: named test scripts', () => {
  const clean = ' 3 pass\n 0 fail\n';

  const TEST_SCRIPTS: readonly string[] = [
    'bun run test:unit',
    'npm run test:e2e',
    'pnpm run test:integration',
    'yarn test:unit',
    'bun run test-ci',
    'make test',
  ];

  for (const command of TEST_SCRIPTS) {
    test(`counts "${command}"`, () => {
      expect(detect({ command, stdout: clean })).toBe(EventType.TestsPassed);
    });
  }

  const NOT_TEST_SCRIPTS: readonly string[] = [
    'bun run check',
    'npm run lint',
    'bun run testimonials',
    'make build',
  ];

  for (const command of NOT_TEST_SCRIPTS) {
    test(`ignores "${command}"`, () => {
      expect(detect({ command, stdout: clean })).toBeUndefined();
    });
  }

  test('ignores a failing named test script', () => {
    expect(
      detect({ command: 'bun run test:unit', stdout: ' 3 pass\n 2 fail\n' }),
    ).toBeUndefined();
  });
});

describe('detectAccomplishment: runner must be in command position', () => {
  const clean = ' 3 pass\n 0 fail\n';

  const NOT_A_TEST_RUN: readonly string[] = [
    'cat jest.config.js',
    'sed -i s/a/b/ vitest.config.ts',
    'rm pytest.ini',
    'ls spec/rspec_helper.rb',
    'git diff go.test.ts',
  ];

  for (const command of NOT_A_TEST_RUN) {
    test(`ignores "${command}"`, () => {
      expect(detect({ command, stdout: clean })).toBeUndefined();
    });
  }

  const TEST_RUNS: readonly string[] = [
    'npx vitest run',
    'cd api && bun test',
    'python -m pytest -q',
    './gradlew test',
    'CI=1 npm test',
    'jest --coverage',
    'bunx vitest',
    'pnpm exec jest',
    './node_modules/.bin/jest',
  ];

  for (const command of TEST_RUNS) {
    test(`counts "${command}"`, () => {
      expect(detect({ command, stdout: clean })).toBe(EventType.TestsPassed);
    });
  }
});
