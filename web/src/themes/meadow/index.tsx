import type { ComponentChildren } from 'preact';
import type { TreeView } from '../../view-model/grove-view';
import { createGrove2dScene, growthLabel } from '../shared/grove-2d';
import { type Theme, ThemeId } from '../theme';
import { MeadowTreeDrawing } from './meadow-tree';

function Backdrop({ children }: { children: ComponentChildren }) {
  return <div class="meadow">{children}</div>;
}

function Tree({ tree }: { tree: TreeView }) {
  return (
    <figure class="meadow-tree">
      <MeadowTreeDrawing stage={tree.stage} />
      <figcaption>
        <strong>{tree.project}</strong>
        <span>{growthLabel(tree)}</span>
      </figcaption>
    </figure>
  );
}

function EmptyState() {
  return (
    <p class="meadow-empty">
      Your meadow is waiting. Work on a project with your coding agent and the
      first seed will be planted.
    </p>
  );
}

export const meadowTheme: Theme = {
  id: ThemeId.Meadow,
  name: 'Meadow',
  Scene: createGrove2dScene({ Backdrop, Tree, EmptyState }),
};
