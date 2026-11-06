# Bitgrove

> A cozy grove that grows from what you **tend**, not from what you spend.

Bitgrove turns coding with Claude Code into a calm, healthy game. Install it
once and keep working: every project becomes a tree, and it grows on the days
you actually accomplish something (tests passing, commits landing). The day
closes on its own, nothing grows after hours, and nothing ever wilts while
you rest.

```
Bitgrove · 12 tended days

🌳 api      16 days · 14 to 🌲
🌿 web       4 days ·  3 to 🪴
🌰 scratch   0 days ·  1 to 🌱
```

## Install

Requires Linux or macOS (Windows via WSL), `curl`, and Node 20+ or Bun.

```bash
curl -fsSL https://raw.githubusercontent.com/macluiggy/bitgrove/main/install.sh | sh
```

The installer downloads the latest release and runs `bitgrove init`, which
copies Bitgrove to `~/.bitgrove/bin/`, adds a `bitgrove` command to
`~/.local/bin/`, backs up `~/.claude/settings.json`, and registers three hooks
(SessionStart, PostToolUse on Bash, Stop). Restart Claude Code afterwards. If
`~/.local/bin` is not on your PATH, `init` tells you how to add it.

To update later, run `bitgrove update` (or the same `curl` command again);
your grove is kept. To pin a version:

```bash
curl -fsSL https://raw.githubusercontent.com/macluiggy/bitgrove/main/install.sh | BITGROVE_VERSION=0.1.0 sh
```

### From source

```bash
bun install
bun run build
node dist/bitgrove.mjs init
```

## Release

Pushing to a branch only runs CI. Publishing happens when a `v*` tag is pushed:
GitHub Actions checks, builds and publishes `bitgrove.mjs` and `install.sh` to
a GitHub Release, and `curl | sh` installs it from then on.

From an up-to-date, clean `main`:

```bash
bun run release:patch   # 0.2.0 -> 0.2.1
bun run release:minor   # 0.2.0 -> 0.3.0
bun run release:major   # 0.2.0 -> 1.0.0
```

Each one bumps `package.json`, commits `chore(release): vX.Y.Z`, tags it and
pushes. The script refuses to run outside `main`, with uncommitted changes, or
when `main` is not in sync with `origin`.

Which one ([Semantic Versioning](https://semver.org)):

| Bump      | When                                                                 | Bitgrove examples                                                                                                  |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **patch** | Bug fixes only; nothing new for the player, nothing changes for them | A test runner that was not detected, a drawing glitch in a theme, a typo                                           |
| **minor** | New things that keep working with what players already have          | A new theme, `bitgrove view`, a new agent adapter, a new command                                                   |
| **major** | A change that breaks something players or integrations rely on       | A new event format old saves cannot read, renamed or removed commands, different hook setup that needs a reinstall |

While the version is `0.x`, the project is still taking shape: breaking
changes go in a **minor** (`0.2.0 -> 0.3.0`) and `1.0.0` is the deliberate
"this is stable" release.

## Use

Just work. Then, anytime:

```bash
bitgrove          # your grove in the terminal
bitgrove view     # your grove in the browser, with themes
bitgrove update   # install the latest release (alias: upgrade); your grove is kept
bitgrove help     # every command
```

`bitgrove view` writes a self-contained page to `~/.bitgrove/view.html` and
opens it. It works offline; nothing is uploaded.

## Uninstall

```bash
bitgrove uninstall
```

Removes only Bitgrove's hooks, launcher and `bitgrove` command. Your grove stays in `~/.bitgrove/`.

## Privacy

Stored locally only: event type, time, project folder name, agent name. Never
code, prompts, paths or command output. Commits are counted from your local
git history (timestamps only, filtered by your git email). Nothing leaves your
machine.

## Design

Why it works this way: [docs/design.md](docs/design.md).

## License

[MIT](LICENSE)
