# Bitgrove MVP

Objective: minimal working Bitgrove for Claude Code, installable with one command, growing a grove from real accomplishments. Design: `docs/design.md`.
Branch: `main` (new repo, first commits). Delivery: ask-on-risk. Test runner: `bun test`.

## Specs

- S1 — Tech: TypeScript, developed with Bun, bundled to a single JS file that runs on Bun or Node (launcher prefers `bun`, falls back to `node`). Zero runtime dependencies. User quote: "ok con bun/node entonces".
- S2 — Architecture follows backtemplate's philosophy. User quote: "sigue la filosofia del @core/backtemplate/ que tiene alta cohesion y bajo acoplamiento, como figuras legos que se pueden ir agregando o quitando sin daniar el codigo, con la menor dependencia posible, siguiendo las mejores practicas". Hexagonal layers without jumps (domain imports nothing outside domain; application depends only on domain and its own ports), enforced by an architecture test. No magic strings: named `as const` objects. No `Date` in domain/application: the clock is a port.
- S3 — Install like gentle-ai with one command. User quote: "se puede instalar como gentle, o mejor aun con npm luego lo ejecutas en la temrinal y lo configuras en claude, codex, opencode, etc como el gentle ai". MVP: `bitgrove init` configures Claude Code only (backup first, idempotent); `bitgrove uninstall` restores. Agents are pluggable adapters. User quote: "empezamos con claude code entonces".
- S4 — Automatic. User quote: "quiero que sea automatico, que vaya creciendo a medida que vas usando el agente para codificar si me entiendes? automaticamente una vez instales el plugin de claude code". Hooks record accomplishments with no commands needed.
- S5 — Healthy design: the principles P1–P8 in `docs/design.md` (reward accomplishment not volume, no leaderboards, absence never hurts, after-hours nothing grows, daily caps, silent while working, local-only).
- S6 — Growth rules from `docs/design.md` "Growth rules": one tree per project, grows by tended days, stages 0/1/3/7/15/30, no decay, after-hours does not count, day boundary 04:00, default end hour 19:00.
- S7 — Overnight report: the first session of a new day shows what grew since the previous day, once. Bedtime line: the first Stop after the end hour shows one gentle line, once per day.
- S8 — `bitgrove` (or `bitgrove status`) prints the grove as text.
- S9 — Hooks never block or break the agent: always exit 0, swallow errors, fast.
- S10 — Progress lives in `~/.bitgrove/` (events JSONL + config), separate from the code.

## Tasks

| ID  | Specs           | Route                                                       | Status                                                | Commit      |
| --- | --------------- | ----------------------------------------------------------- | ----------------------------------------------------- | ----------- |
| T1  | S1, S2, S5, S6  | delegated (opencode-worker, per user's global offload rule) | done (47 tests)                                       | uncommitted |
| T2  | S2, S7, S8, S10 | delegated (opencode-worker)                                 | done (68 tests)                                       | uncommitted |
| T3  | S3, S4, S9      | delegated (opencode-worker)                                 | done; fixes written inline after worker quota ran out | uncommitted |
| T4  | all             | inline: build, local install, manual play-through           | done in isolated HOME; real Claude Code not yet tried | uncommitted |

## Log

- L1 (2026-11-06, user, verbatim): "seguro? bueno me parece bien empecemos con el mvp entonces"
- L2: Name chosen: Bitgrove (npm and GitHub name free on 2026-11-06; trademarks not checked). Repo created at `/home/admin/Documentos/programming/bitgrove`, separate from backtemplate.
- L3: Temporal exists in Node 26 and Bun 1.4.4 locally, but older Node lacks it; domain uses plain `YYYY-MM-DD` strings and an injected clock instead.
- L4: User declined the first commit attempt; all work stays uncommitted until they ask.
- L5: Verified hook contract (code.claude.com/docs/en/hooks): Bash `tool_response` has no exit code; failed commands go to PostToolUseFailure. Detector combines both signals with output failure markers.
- L6: Review found two bugs in T3: `cat jest.config.js` counted as passing tests, and `uninstall` matched any hook containing "bitgrove". Worker returned OPENCODE_FREE_EXHAUSTED on the fix; parent wrote it inline (RED observed: 4 fails + missing export; GREEN: 120 tests).
- L7: Play-through in isolated HOME: init, hooks, overnight report once per day, bedtime once per day, after-hours commit does not grow, garbage stdin exits 0 silently, uninstall keeps the save.
- L9 (2026-11-06): Real install verified in Claude Code: SessionStart and PostToolUse (Bash) fire, a headless `claude -p` session running `bun test` recorded `tests.passed`, and the grove grew to 🌱. Note: the user's first interactive session ran no tests, so nothing was recorded then. Still pending from L8: whether `systemMessage` is shown (overnight tomorrow, bedtime after 19:00).
- L10 (2026-11-06): Added `install.sh` (curl | sh, downloads `bitgrove.mjs` from GitHub Releases, runs `init`) and `.github/workflows/release.yml` (tag `v*` → version check, check, e2e, `gh release create`). Worker returned OPENCODE_FREE_EXHAUSTED; written inline. Installer tested locally via `file://` URL: install, idempotent rerun, bad URL, missing runtime, 404 version. Workflow not yet run on GitHub.
- L11 (2026-11-06): First v0.1.0 Action failed: e2e tests need `dist/`, absent on a clean checkout. Fixed by building inside `check` (commit 856097a); tag v0.1.0 moved to it with user approval (no release had been published). Release published with `bitgrove.mjs` and `install.sh`; real `curl | sh` install from GitHub verified in an isolated HOME.
- L12 (2026-11-06): User request: "yo quiero que con el curl ya quede instalado y al hacer bitgrove en la terminal pueda entrar". `init` now writes a marked shim script to `~/.local/bin/bitgrove` (a script, not a symlink, because the launcher resolves its bundle from its own directory), prints a PATH hint when that dir is not on PATH, never overwrites a foreign file there; `uninstall` removes only the marked shim. RED: 4 new e2e tests failed; GREEN: 124 pass. Verified through `install.sh` in an isolated HOME. Version bumped to 0.1.1.
- L13 (2026-11-06): Critical review found the user's own workflow grew nothing: `bun run test:unit`, `npm run test:e2e`, `make test` were not detected, and the user's settings deny `git commit` to Claude, so commits (made by hand) were never seen. User approved the fix ("simin"). Detector now counts `test`/`test:*`/`test-*` scripts for bun/npm/pnpm/yarn and `make test`; Bash commit detection removed. New `CommitLog` port + `GitCommitLog` adapter + `syncCommits` use case read own commits (repo `user.email`, all local branches, committer time) since the first event, on SessionStart and Stop; dedup by project + instant. RED observed (8 detector, 3 hook/use-case failures, missing module); GREEN: 142 tests. Verified on the real Bitgrove repo with a scratch save: 7 commits recorded, rerun adds none, tree grew to 🌱.
- L14 (2026-11-06): User request: "ok dale hasle el mvp, teniendo en cuenta que se quiere evolucionar esto para dejarlo hasta ser posible en 3d, por ahora lo mas simple en 2d, luego se hace mas bonito en 2d, y si se da se mejora a 3d, o inclusive la capacidad de cambiar el tema". Built `web/` (Preact + Vite + vite-plugin-singlefile, dev dependencies): `toGroveView` view-model over the shared domain, `GroveSource` port (embedded data now, cloud later), themes as Strategy (`Theme.Scene`) with a 2D Abstract Factory (`Grove2dKit`), Meadow (SVG) and Terminal themes, theme choice in localStorage. `bitgrove view [--no-open]` embeds the data in the single HTML and opens it. RED observed (missing modules, 2 e2e fails); GREEN: 157 tests. Verified in a browser with sample data: all six stages render, layout fixed so every tree stands on grass, theme switch persists across reload, no console errors.
- L8: Still unverified in real Claude Code: whether `systemMessage` is shown to the user on SessionStart and Stop, and whether failed Bash commands skip PostToolUse.
