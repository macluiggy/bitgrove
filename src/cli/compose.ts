import type { Deps } from '../application';
import {
  type BitgrovePaths,
  GitCommitLog,
  JsonlEventStore,
  JsonRulesStore,
  type PathEnvironment,
  resolvePaths,
  SystemClock,
} from '../infrastructure';

export interface Composition {
  deps: Deps;
  paths: BitgrovePaths;
}

export function composeDeps(env: PathEnvironment): Composition {
  const paths = resolvePaths(env);

  return {
    deps: {
      events: new JsonlEventStore(paths.eventsFile),
      rules: new JsonRulesStore(paths.configFile),
      clock: new SystemClock(),
      commits: new GitCommitLog(),
    },
    paths,
  };
}
