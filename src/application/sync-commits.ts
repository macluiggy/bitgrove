import { EventType, type GroveEvent } from '../domain';
import { buildEventAt } from './build-event';
import type { Activity, Deps } from './ports';

function firstEventInstant(events: readonly GroveEvent[]): string | undefined {
  let first: string | undefined;

  for (const event of events) {
    if (first === undefined || event.at < first) {
      first = event.at;
    }
  }

  return first;
}

/**
 * Records your own commits in `projectDir` as accomplishments, on the day and
 * hour they were made. Only commits since Bitgrove first saw you count, so old
 * history never grows trees, and each commit is recorded once per project.
 */
export function syncCommits(
  deps: Deps,
  activity: Activity,
  projectDir: string,
): number {
  const events = deps.events.readAll();
  const since = firstEventInstant(events);

  if (since === undefined) {
    return 0;
  }

  const recorded = new Set(
    events
      .filter(
        (event) =>
          event.type === EventType.CommitMade &&
          event.project === activity.project,
      )
      .map((event) => event.at),
  );

  let added = 0;

  for (const commit of deps.commits.ownCommitsSince(projectDir, since)) {
    if (recorded.has(commit.instant)) {
      continue;
    }

    deps.events.append({
      ...buildEventAt(deps, activity, EventType.CommitMade, commit),
      work: commit.work,
    });
    recorded.add(commit.instant);
    added += 1;
  }

  return added;
}
