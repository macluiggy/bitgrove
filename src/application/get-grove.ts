import { buildGrove, type Grove } from '../domain';
import type { Deps } from './ports';

export function getGrove(deps: Deps): Grove {
  return buildGrove(deps.events.readAll(), deps.rules.load());
}
