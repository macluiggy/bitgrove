import { buildWorld, type World } from '../domain';
import type { Deps } from './ports';

export function getWorld(deps: Deps): World {
  return buildWorld(deps.events.readAll(), deps.rules.load());
}
