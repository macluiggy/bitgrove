import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function settingsPath(home: string): string {
  return join(home, '.claude', 'settings.json');
}

export function updateSettingsFile(
  filePath: string,
  transform: (settings: Record<string, unknown>) => Record<string, unknown>,
  nowStamp: string,
): { backupPath?: string } {
  if (!existsSync(filePath)) {
    const created = transform({});
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(created, null, 2)}\n`);
    return {};
  }

  const original = readFileSync(filePath, 'utf8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(original);
  } catch {
    throw new Error(
      `Cannot update Claude Code settings: ${filePath} is not valid JSON. Fix it by hand and try again.`,
    );
  }

  if (!isJsonObject(parsed)) {
    throw new Error(
      `Cannot update Claude Code settings: ${filePath} must contain a JSON object.`,
    );
  }

  const backupPath = `${filePath}.bitgrove-backup-${nowStamp}`;
  copyFileSync(filePath, backupPath);
  writeFileSync(filePath, `${JSON.stringify(transform(parsed), null, 2)}\n`);

  return { backupPath };
}
