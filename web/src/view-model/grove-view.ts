import {
  buildGrove,
  type GroveEvent,
  type GroveRules,
  nextThreshold,
  type Stage,
} from '../../../src/domain';

// What any theme needs to draw a grove, already decided: themes only paint it.
export interface TreeView {
  project: string;
  stage: Stage;
  tendedDays: number;
  nextStage: Stage | undefined;
  daysToNextStage: number | undefined;
}

export interface GroveView {
  trees: TreeView[];
  totalTendedDays: number;
  isEmpty: boolean;
}

export function toGroveView(
  events: readonly GroveEvent[],
  rules: GroveRules,
): GroveView {
  const grove = buildGrove(events, rules);

  return {
    trees: grove.trees.map((tree) => {
      const next = nextThreshold(tree.tendedDays);

      return {
        project: tree.project,
        stage: tree.stage,
        tendedDays: tree.tendedDays,
        nextStage: next?.stage,
        daysToNextStage:
          next === undefined ? undefined : next.minTendedDays - tree.tendedDays,
      };
    }),
    totalTendedDays: grove.totalTendedDays,
    isEmpty: grove.trees.length === 0,
  };
}
