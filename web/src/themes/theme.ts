import type { FunctionComponent } from 'preact';
import type { GroveView } from '../view-model/grove-view';

export const ThemeId = {
  Meadow: 'meadow',
  Terminal: 'terminal',
} as const;

export type ThemeId = (typeof ThemeId)[keyof typeof ThemeId];

export interface SceneProps {
  grove: GroveView;
}

/**
 * Strategy: a theme paints the whole scene from the same GroveView, so a 2D,
 * a prettier 2D or a 3D theme can be swapped without touching the game.
 */
export interface Theme {
  id: ThemeId;
  name: string;
  Scene: FunctionComponent<SceneProps>;
}
