import { Era } from '../domain';

// Shared by the terminal and the web page, so both name eras the same way.

export const ERA_EMOJI = {
  [Era.Clearing]: '🌱',
  [Era.Grove]: '🌿',
  [Era.Wood]: '🌳',
  [Era.Forest]: '🌲',
  [Era.Hamlet]: '🏡',
  [Era.Village]: '🏘️',
} as const satisfies Record<Era, string>;

export const ERA_NAME = {
  [Era.Clearing]: 'Clearing',
  [Era.Grove]: 'Grove',
  [Era.Wood]: 'Wood',
  [Era.Forest]: 'Forest',
  [Era.Hamlet]: 'Hamlet',
  [Era.Village]: 'Village',
} as const satisfies Record<Era, string>;
