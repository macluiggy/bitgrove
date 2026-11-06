import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '../..');
const SRC_DIR = path.join(REPO_ROOT, 'src');
const DOMAIN_DIR = path.join(SRC_DIR, 'domain');
const APPLICATION_DIR = path.join(SRC_DIR, 'application');

const IMPORT_PATTERN = /(?:from\s*|import\s*)['"]([^'"]+)['"]/g;
const FORBIDDEN_TOKENS = ['new Date', 'Date.now', 'console.', 'process.'];

function listTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function importSpecifiers(source: string): string[] {
  return Array.from(
    source.matchAll(IMPORT_PATTERN),
    (match) => match[1],
  ).filter((specifier): specifier is string => specifier !== undefined);
}

function isInside(directory: string, target: string): boolean {
  const relative = path.relative(directory, target);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

const sourceFiles = listTypeScriptFiles(SRC_DIR);
const domainFiles = sourceFiles.filter((file) => isInside(DOMAIN_DIR, file));
const applicationFiles = sourceFiles.filter((file) =>
  isInside(APPLICATION_DIR, file),
);

function forbiddenTokenViolations(files: string[]): string[] {
  const violations: string[] = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');

    for (const token of FORBIDDEN_TOKENS) {
      if (source.includes(token)) {
        violations.push(`${file}: contains "${token}"`);
      }
    }
  }

  return violations;
}

describe('layer boundaries', () => {
  test('domain imports stay inside the domain layer', () => {
    const violations: string[] = [];

    for (const file of domainFiles) {
      const source = readFileSync(file, 'utf8');

      for (const specifier of importSpecifiers(source)) {
        if (!specifier.startsWith('.')) {
          violations.push(`${file}: non-relative import "${specifier}"`);
          continue;
        }

        const target = path.resolve(path.dirname(file), specifier);
        if (!isInside(DOMAIN_DIR, target)) {
          violations.push(
            `${file}: import "${specifier}" escapes the domain layer`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test('application imports stay inside domain or application', () => {
    const violations: string[] = [];

    for (const file of applicationFiles) {
      const source = readFileSync(file, 'utf8');

      for (const specifier of importSpecifiers(source)) {
        if (!specifier.startsWith('.')) {
          violations.push(`${file}: non-relative import "${specifier}"`);
          continue;
        }

        const target = path.resolve(path.dirname(file), specifier);
        if (
          !isInside(DOMAIN_DIR, target) &&
          !isInside(APPLICATION_DIR, target)
        ) {
          violations.push(
            `${file}: import "${specifier}" escapes the allowed layers`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test('domain and application avoid ambient time and I/O globals', () => {
    const violations = forbiddenTokenViolations([
      ...domainFiles,
      ...applicationFiles,
    ]);

    expect(violations).toEqual([]);
  });
});
