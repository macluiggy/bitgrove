# Bitgrove — Game Design

> A cozy grove that grows from what you **tend**, not from what you spend.

Bitgrove is a game layer for coding with AI agents. It runs on its own through
the agent's hooks: install it once and keep working. Your grove grows from real
accomplishments, the day closes on its own, and nothing ever punishes you for
resting.

## Why this exists

Coding with agents already behaves like a slot machine: prompt, wait a few
seconds, sometimes get something great. That is variable reinforcement, and it
makes stopping hard. Most existing gamification adds fuel to that fire: it
rewards tokens, tool calls, keystrokes or hours, and adds global leaderboards.

Bitgrove is designed the other way around: **leave the player better and
happier, not hooked.** The reference is cozy games (a day that ends, progress
that stays, no punishment for absence), not casinos.

## Principles (non-negotiable)

Every mechanic is checked against one question:
**does this make you feel good after closing the laptop, or only while it is open?**

| #   | Principle                                 | Science behind it                             | What it rules out                       |
| --- | ----------------------------------------- | --------------------------------------------- | --------------------------------------- |
| P1  | Reward accomplishment, never volume       | Goodhart's law; overjustification effect      | XP for tokens, tool calls, lines, hours |
| P2  | Compare only with your past self          | Social comparison harms well-being            | Leaderboards, public rankings           |
| P3  | Absence never hurts                       | Loss aversion breeds guilt, not joy           | Punitive streaks, decay, wilting        |
| P4  | Stopping is part of the game              | Recovery and sleep sustain well-being         | Rewards for late-night work             |
| P5  | Daily caps: more hours ≠ more growth      | Diminishing returns break the compulsion loop | Unlimited points per day                |
| P6  | Surprise lives in content, not in payouts | Reward prediction error, used gently          | Random loot for activity                |
| P7  | Silent while you work                     | Interrupting flow is costly                   | Popups on every action                  |
| P8  | Local and private by default              | Autonomy, trust                               | Telemetry, uploads of code or prompts   |

## Core loop (MVP)

| Stardew-like moment | In Bitgrove                                                                                                                           | Automatic?  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Planting            | Working in a project plants its tree                                                                                                  | Yes         |
| Watering            | Tests passing, commits landing                                                                                                        | Yes (hooks) |
| Sleeping            | The day closes on its own; the first session of the next day shows what grew overnight                                                | Yes         |
| Bedtime             | After your end-of-day hour, the grove sleeps: work still gets recorded, but nothing grows. One gentle line tells you so, once per day | Yes         |
| Looking at the farm | `bitgrove` prints the grove                                                                                                           | On demand   |

### Growth rules

- One **tree per project** (identified by its folder name).
- A **tended day** for a project is a day with at least one counted accomplishment
  in work hours: a test run that passed (`test`, `test:unit`, `make test`…) or
  a commit of yours that landed.
- Commits come from **git history**, not from what the agent prints: at the
  start and end of each agent turn Bitgrove reads your own commits
  (matching the repo's `user.email`, every local branch) since it first saw
  you, so commits made by hand in a terminal or an IDE count too. Old history
  from before Bitgrove never grows trees.
- Trees grow by **tended days**, never by volume within a day (P1, P5).
- Stages: seed 🌰 (0) → sprout 🌱 (1) → sapling 🌿 (3) → young tree 🪴 (7) →
  tree 🌳 (15) → ancient tree 🌲 (30) tended days.
- Nothing decays. A tree untouched for a month is exactly as you left it (P3).
- After hours (default: from 19:00 until the day boundary at 04:00) nothing
  counts toward growth (P4).

## Architecture

Hexagonal, Lego-style: high cohesion, low coupling, zero runtime dependencies.

```
src/
  domain/          pure rules: events, days, stages, grove (no I/O, no imports outside domain)
  application/     use cases + ports (EventStore, Clock, Config)
  infrastructure/  file-backed adapters (JSONL event store, JSON config, system clock)
  presentation/    text rendering of the grove
web/               the browser view (Preact + Vite): view-model, data sources, swappable themes
  agents/          one self-contained folder per agent (claude-code today)
  cli/             command routing and composition root
```

- **Event sourcing.** Every accomplishment is appended to `~/.bitgrove/events.jsonl`.
  The grove is always recomputed from events, so improving the rules replays
  your whole history without losing anything.
- **Agents are adapters.** Each agent folder translates its hook payloads into
  the same normalized activity. Adding Codex or OpenCode means adding a folder,
  never touching the domain.
- **The game and your save are separate.** Code lives in this repo; your save
  lives in `~/.bitgrove/`. Updating Bitgrove never touches your progress.

## Privacy

Bitgrove stores only: event type, timestamp, project folder name, agent name.
To count commits it reads only their timestamps from your local git history,
filtered by your git email.
Never code, prompts, file paths, diffs or command output. Nothing leaves your
machine.

## Living ecosystems

Watching your work grow should be **deeply satisfying and make you happy**, not
just informative. Rules live in `src/domain/ecosystem.ts` and
`src/domain/xp.ts` (pure, deterministic, replayed from your events); the art
lives in the Forest theme. The numbers below are the current tuning.

### One ecosystem per project

Every project is its **own independent ecosystem** that grows organically as
you work on it:

```
clearing (0 tended days) → grove (3) → wood (10) → forest (25)
→ hamlet (45: a cabin and a well) → village (80: houses, one more every 15 days)
```

- Trees multiply: new trees take root next to the old ones, and each tree
  grows from seedling to ancient as the project is tended.
- Life arrives: chickens, sheep and cows.
- People arrive: long-lived projects open into a hamlet, then a village.
- It evolves on its own: you never place anything. Nothing ever wilts or
  shrinks while you are away (P3). Everything is bounded, so a plot stays
  drawable however long the history.

### Your work decides what grows

The kind of work comes from the conventional commit type the agent (or you)
writes: `feat`, `fix`, `refactor`/`perf`, `test`, `docs`, `chore`/`ci`/`build`.
A commit without a type counts as a feature; a passing test run counts as
tests. Each day leaves a different, meaningful mark (P6: surprise lives in
content):

| You finished… | Your ecosystem…                                    |
| ------------- | -------------------------------------------------- |
| a feature     | plants a new tree                                  |
| a refactor    | the youngest growing tree catches up               |
| a bug fix     | flowers bloom                                      |
| tests         | an animal arrives (once it is a grove)             |
| docs          | a stone path grows                                 |
| a chore       | a bush grows                                       |
| many days     | the era advances: cabin, well, then village houses |

Privacy (P8): from git, Bitgrove keeps only the commit type, never the message,
code or diffs.

### Experience points: per task, with a daily cap

Each finished task earns XP by its kind (feature 30, refactor 20, fix 15, tests
10, docs 10, chore 5), but a day never earns more than 100 XP across all
projects, so many tiny tasks never beat one good day (P1, P5). Re-running the
tests the same day earns nothing more; work after hours earns nothing (P4).
Going from level n to n + 1 takes n × 100 XP. XP never decays and never appears
in a leaderboard (P2, P3).

### Feeling, not just data (next)

Still to come: small animations (wind in the trees, an animal crossing) and a
"while you were coding…" summary of what arrived, in the overnight message.

## Roadmap (after the MVP)

1. Skills that grow with demonstrated mastery (testing, debugging, architecture).
2. Morning intention: optionally pick what you plant today.
3. Mines: optional hard challenges (bosses), never required.
4. Collections and rare discoveries tied to real milestones.
5. Codex and OpenCode adapters.
6. Optional private "save repo" that commits your grove each day.
7. Prettier 2D themes (the pixel-art Forest is the first), then optionally 3D: themes are swappable
   and only paint the same view-model.
8. Optional cloud sync with `bitgrove login` (device-code flow), reusing the
   same web page with a cloud `GroveSource`. Always opt-in (P8).
