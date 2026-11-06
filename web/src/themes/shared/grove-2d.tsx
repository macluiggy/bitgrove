import type { ComponentChildren, FunctionComponent } from 'preact';
import type { TreeView } from '../../view-model/grove-view';
import type { SceneProps } from '../theme';

/**
 * Abstract Factory for 2D themes: each one provides a family of pieces that
 * match each other, and they all share this layout.
 */
export interface Grove2dKit {
  Backdrop: FunctionComponent<{ children: ComponentChildren }>;
  Tree: FunctionComponent<{ tree: TreeView }>;
  EmptyState: FunctionComponent;
}

export function createGrove2dScene(
  kit: Grove2dKit,
): FunctionComponent<SceneProps> {
  const { Backdrop, Tree, EmptyState } = kit;

  return function Grove2dScene({ grove }: SceneProps) {
    return (
      <Backdrop>
        {grove.isEmpty ? (
          <EmptyState />
        ) : (
          <ul class="grove-2d">
            {grove.trees.map((tree) => (
              <li key={tree.project}>
                <Tree tree={tree} />
              </li>
            ))}
          </ul>
        )}
      </Backdrop>
    );
  };
}

export function growthLabel(tree: TreeView): string {
  const days = `${tree.tendedDays} ${tree.tendedDays === 1 ? 'day' : 'days'}`;

  if (tree.daysToNextStage === undefined) {
    return `${days} · fully grown`;
  }

  return `${days} · ${tree.daysToNextStage} to grow`;
}
