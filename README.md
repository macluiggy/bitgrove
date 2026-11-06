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

## Install (from source, for now)

Requires Bun (to build) and Node 20+ or Bun (to run).

```bash
bun install
bun run build
node dist/bitgrove.mjs init
```

`init` copies Bitgrove to `~/.bitgrove/bin/`, backs up `~/.claude/settings.json`,
and registers three hooks (SessionStart, PostToolUse on Bash, Stop). Running it
twice is safe.

## Use

Just work. Then, anytime:

```bash
~/.bitgrove/bin/bitgrove
```

## Uninstall

```bash
~/.bitgrove/bin/bitgrove uninstall
```

Removes only Bitgrove's hooks and launcher. Your grove stays in `~/.bitgrove/`.

## Privacy

Stored locally only: event type, time, project folder name, agent name. Never
code, prompts, paths or command output. Nothing leaves your machine.

## Design

Why it works this way: [docs/design.md](docs/design.md).

## License

[MIT](LICENSE)
