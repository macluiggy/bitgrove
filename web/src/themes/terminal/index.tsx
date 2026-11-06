import type { ComponentChildren } from 'preact';
import { Stage } from '../../../../src/domain';
import type { TreeView } from '../../view-model/grove-view';
import { createGrove2dScene, growthLabel } from '../shared/grove-2d';
import { type Theme, ThemeId } from '../theme';

// Same symbols as the `bitgrove` command in the terminal.
const STAGE_EMOJI: Record<Stage, string> = {
  [Stage.Seed]: '🌰',
  [Stage.Sprout]: '🌱',
  [Stage.Sapling]: '🌿',
  [Stage.YoungTree]: '🪴',
  [Stage.Tree]: '🌳',
  [Stage.Ancient]: '🌲',
};

function Backdrop({ children }: { children: ComponentChildren }) {
  return <div class="terminal">{children}</div>;
}

function Tree({ tree }: { tree: TreeView }) {
  return (
    <p class="terminal-tree">
      <span aria-hidden="true">{STAGE_EMOJI[tree.stage]}</span>{' '}
      <strong>{tree.project}</strong> <span>{growthLabel(tree)}</span>
    </p>
  );
}

function EmptyState() {
  return <p class="terminal-tree">Your grove is empty.</p>;
}

export const terminalTheme: Theme = {
  id: ThemeId.Terminal,
  name: 'Terminal',
  Scene: createGrove2dScene({ Backdrop, Tree, EmptyState }),
};
