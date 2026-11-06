# AGENTS.md

Context for AI agents (Claude Code, Codex, OpenCode, Cursor, Copilot, etc.) working in this repo. Bitgrove is a cozy, healthy game layer for coding with AI agents: it runs through the agent's hooks, records real accomplishments (passing tests, landed commits) and grows one tree per project by tended days.

This file is the **compass**: a short map of what already exists and the mandatory rules, never the full text. Game design and the reasons behind every rule live in [`docs/design.md`](docs/design.md); open it before changing anything a player can feel.

## Mandatory rules

- ⚠️ **Before starting a task, check the [skills](#skills) below** and read the full `SKILL.md` of every one that applies to what you will touch.
- ⚠️ [Every mechanic passes the principles P1–P8](docs/design.md#principles-non-negotiable) — reward accomplishment, never volume (tokens, tool calls, lines, hours); compare only with your past self (no leaderboards); absence never hurts (no streaks, decay or wilting); nothing grows after hours; daily caps; surprise lives in content, not payouts; silent while working; local and private. A feature that breaks one of them is rejected, however fun it looks.
- ⚠️ [Hexagonal layers without jumps](docs/design.md#architecture) — `domain/` imports nothing outside `domain/`; `application/` imports only `domain/` and its own ports. Enforced by `test/architecture/layer-boundary.test.ts`.
- ⚠️ **No ambient time or I/O in `domain/`/`application/`** — no `new Date`, `Date.now`, `console.` or `process.`: the clock, stores and output are ports (`src/application/ports.ts`). Enforced by `layer-boundary.test.ts`.
- ⚠️ **Zero runtime dependencies** — only Node built-ins (`node:fs`, `node:path`…). The bundle must run on Node 20+ and on Bun. Dev dependencies are fine.
- ⚠️ **No magic strings/numbers** — a meaningful literal (event type, hook event, stage, file name, hour) goes in a named `as const` object or constant with its derived type (`EventType.TestsPassed`, not `'tests.passed'`). Never a TS `enum`.
- ⚠️ **Events are append-only and versioned** — the grove is always recomputed from `~/.bitgrove/events.jsonl`. Never rewrite or delete a player's events; a new rule must replay old history correctly. Every event carries `v`; changing its shape bumps `v` and keeps reading old versions.
- ⚠️ **Hooks never break the agent** — `bitgrove hook <agent>` always exits 0, swallows every error, stays fast and prints nothing unless it has a `systemMessage`. Enforced by `hook-handler.test.ts` and `test/e2e/install.test.ts`.
- ⚠️ **Never damage the user's files** — `init`/`uninstall` back up `~/.claude/settings.json` before writing, refuse malformed JSON, touch only Bitgrove's own handlers (matched by the exact launcher signature) and never overwrite a foreign `~/.local/bin/bitgrove`. Uninstall keeps the save in `~/.bitgrove/`.
- ⚠️ **Privacy** — store only event type, time, project folder name and agent name. Never code, prompts, paths, diffs or command output; from git read only commit timestamps of the user's email. Nothing leaves the machine.
- ⚠️ **Tests before behavior** — write the failing test first (RED), then the code (GREEN). Unit tests sit next to the file they test (`*.test.ts`); flows that spawn the built bundle go in `test/e2e/`.
- ⚠️ **Themes only paint** — the web page computes the grove once (`toGroveView`, from the same domain as the CLI) and every theme receives that `GroveView`. A theme never computes growth. A theme is a Strategy (`Theme` with its own `Scene`, so a 3D theme can own the whole scene); 2D themes are built from an Abstract Factory (`Grove2dKit`: `Backdrop`, `Tree`, `EmptyState`) over a shared layout. New theme = a folder in `web/src/themes/` + one entry in `THEMES`.
- ⚠️ **The page never knows where data comes from** — it loads through the `GroveSource` port (`EmbeddedGroveSource` today; a cloud source later). Preact and Vite are dev dependencies compiled into one HTML file that the CLI bundle embeds, so installs stay dependency-free.
- ⚠️ **A new agent is a new folder** — add `src/agents/<agent>/` implementing `AgentAdapter` and register it in `src/agents/index.ts`. Never touch `domain/` to support an agent.

## Capability map

| If you need…                                               | Already exists                                                                                                     | Entry point                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Event types and the event shape                            | `EventType`, `GroveEvent`                                                                                          | `src/domain/event.ts`                                                |
| Game day (04:00 boundary), previous date                   | `gameDayOf`, `previousDate`                                                                                        | `src/domain/calendar.ts`                                             |
| Work hours / after-hours rule                              | `DEFAULT_RULES`, `isAfterHours`                                                                                    | `src/domain/rules.ts`                                                |
| Tree stage from tended days                                | `Stage`, `stageFor`, `nextThreshold`                                                                               | `src/domain/stage.ts`                                                |
| Build the grove from events                                | `buildGrove`, `growthOn`, `tendedDaysByProject`                                                                    | `src/domain/grove.ts`                                                |
| Once-per-day notices (overnight, bedtime)                  | `shouldShowOvernight`, `shouldShowBedtime`, `lastActiveDayBefore`                                                  | `src/domain/notices.ts`                                              |
| Ports (events, rules, clock, commits)                      | `EventStore`, `RulesStore`, `Clock`, `CommitLog`, `Deps`                                                           | `src/application/ports.ts`                                           |
| Use cases                                                  | `recordAccomplishment`, `syncCommits`, `startSession`, `checkBedtime`, `getGrove`                                  | `src/application/`                                                   |
| Own commits from git history (any branch, terminal or IDE) | `GitCommitLog`                                                                                                     | `src/infrastructure/git-commit-log.ts`                               |
| Save files and their location                              | `resolvePaths` (`BITGROVE_HOME` or `~/.bitgrove`), JSONL event store, JSON rules store, system clock               | `src/infrastructure/`                                                |
| Text output of the grove and notices                       | `renderGrove`, `renderOvernight`, `renderBedtime`                                                                  | `src/presentation/text-renderer.ts`                                  |
| Claude Code hooks: detect tests, sync commits, install     | `detectAccomplishment`, `handleClaudeHook`, `installHooks`/`uninstallHooks`, `claudeCodeAgent`                     | `src/agents/claude-code/`                                            |
| Agent registry                                             | `AGENTS`, `getAgent`                                                                                               | `src/agents/index.ts`                                                |
| CLI commands and composition root                          | `run` (`init`, `status`, `uninstall`, `hook`, `help`), `composeDeps`                                               | `src/cli/main.ts`, `src/cli/compose.ts`                              |
| Launcher and `bitgrove` command on PATH                    | `LAUNCHER_SCRIPT`, `hookCommand`, `installCommandShim`/`removeCommandShim`                                         | `src/cli/launcher.ts`, `src/cli/command-shim.ts`                     |
| Web page: view-model, data sources, themes                 | `toGroveView`, `GroveSource`/`EmbeddedGroveSource`/`SampleGroveSource`, `Theme`, `Grove2dKit`, `THEMES`/`getTheme` | `web/src/`                                                           |
| `bitgrove view` (writes and opens the page)                | `renderViewPage`, `DATA_PLACEHOLDER`                                                                               | `src/cli/view-page.ts`, `src/cli/main.ts`                            |
| `bitgrove update`/`upgrade`, `version`, `help`             | `runUpdate` (testable core), `latestReleaseTag`/`downloadReleaseBundle`/`runBundleInit` (GitHub), `USAGE`          | `src/cli/update.ts`, `src/cli/github-releases.ts`, `src/cli/main.ts` |
| One-command install and releases                           | `install.sh` (curl \| sh from GitHub Releases), release workflow on tag `v*`                                       | `install.sh`, `.github/workflows/release.yml`                        |

If you add, rename or remove one of these, update its row in the same commit.

## Skills

Project skills live in [`.agents/skills/`](.agents/skills/). Each `SKILL.md` is short; its `references/details.md` holds the long examples, so open it only when the summary is not enough.

| Skill                                                                            | Use it when you touch…                                                              |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`bun`](.agents/skills/bun/SKILL.md)                                             | `package.json` scripts, `bun test`, `bun build` (the bundle in `dist/`), `bun.lock` |
| [`typescript-advanced-types`](.agents/skills/typescript-advanced-types/SKILL.md) | domain types, `as const` objects and their derived types, ports and generics        |
| [`bash-defensive-patterns`](.agents/skills/bash-defensive-patterns/SKILL.md)     | `install.sh`, the launcher and command shim scripts, CI workflow `run:` steps       |

If you add or remove a skill, update this table in the same commit.

## Documentation map

- Game design, principles, growth rules, roadmap → [`docs/design.md`](docs/design.md)
- Install, use, release → [`README.md`](README.md)
- Feature logbooks (specs, tasks, decisions) → [`odd/tasks/`](odd/tasks/)
- Project skills → [`.agents/skills/`](.agents/skills/) (see [Skills](#skills))

## Frequent commands

```bash
bun install
bun run check        # lint + typecheck + build + all tests (what CI runs)
bun test             # tests only (e2e needs `bun run build` first)
bun run format       # Biome: fix formatting
bun run build        # web page (dist/web) + CLI bundle (dist/bitgrove.mjs)
bun run dev:web      # design the web page with demo data (Vite dev server)
node dist/bitgrove.mjs init   # install from source into your real Claude Code
```

Try changes without touching your real setup: `HOME=$(mktemp -d) node dist/bitgrove.mjs init`. To test commit sync, keep your real `HOME` (git needs your `user.email` from `~/.gitconfig`) and point only the save elsewhere: `BITGROVE_HOME=$(mktemp -d) …`.

Release from a clean, synced `main`: `bun run release:patch|minor|major` (see the README for which one). Pushing to a branch only runs CI; only a `v*` tag publishes.

## What NOT to do

- Don't add runtime dependencies or ESLint/Prettier — the repo uses Biome.
- Don't commit `dist/`, `coverage/` or `node_modules/`.
- Don't reward volume or add anything that punishes absence (see P1–P8).
- Don't write to the user's `~/.claude/settings.json` or `~/.bitgrove/` from tests: use a temporary `HOME`.
- Don't change `install.sh` or the release workflow without testing the installer end to end — it reaches every user.
