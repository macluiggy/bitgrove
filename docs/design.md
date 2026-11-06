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
  in work hours: a test run that passed or a commit that landed.
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
Never code, prompts, file paths, diffs or command output. Nothing leaves your
machine.

## Roadmap (after the MVP)

1. Skills that grow with demonstrated mastery (testing, debugging, architecture).
2. Morning intention: optionally pick what you plant today.
3. Mines: optional hard challenges (bosses), never required.
4. Collections and rare discoveries tied to real milestones.
5. Codex and OpenCode adapters.
6. Optional private "save repo" that commits your grove each day.
7. Pixel art.
