import { join } from 'node:path';

const BITGROVE_DIRECTORY = '.bitgrove';
const EVENTS_FILE = 'events.jsonl';
const CONFIG_FILE = 'config.json';
const BIN_DIRECTORY = 'bin';

export interface BitgrovePaths {
  home: string;
  eventsFile: string;
  configFile: string;
  binDir: string;
}

export interface PathEnvironment {
  HOME?: string;
  BITGROVE_HOME?: string;
}

function isSet(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

export function resolvePaths(env: PathEnvironment): BitgrovePaths {
  let home: string;

  if (isSet(env.BITGROVE_HOME)) {
    home = env.BITGROVE_HOME;
  } else if (isSet(env.HOME)) {
    home = join(env.HOME, BITGROVE_DIRECTORY);
  } else {
    throw new Error(
      'Cannot resolve the Bitgrove home directory: set BITGROVE_HOME or HOME.',
    );
  }

  return {
    home,
    eventsFile: join(home, EVENTS_FILE),
    configFile: join(home, CONFIG_FILE),
    binDir: join(home, BIN_DIRECTORY),
  };
}
