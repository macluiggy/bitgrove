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

Run the same command again to update; your grove is kept. To pin a version:

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

Bump the version and push the tag; GitHub Actions checks, builds and publishes
`bitgrove.mjs` and `install.sh` to a GitHub Release.

```bash
npm version minor
git push --follow-tags
```

## Use

Just work. Then, anytime:

```bash
bitgrove
```

## Uninstall

```bash
bitgrove uninstall
```

Removes only Bitgrove's hooks, launcher and `bitgrove` command. Your grove stays in `~/.bitgrove/`.

## Privacy

Stored locally only: event type, time, project folder name, agent name. Never
code, prompts, paths or command output. Nothing leaves your machine.

## Design

Why it works this way: [docs/design.md](docs/design.md).

## License

[MIT](LICENSE)
