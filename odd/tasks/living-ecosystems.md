# Living ecosystems

Objective: every project is an independent ecosystem that grows organically (trees multiply, animals arrive, it evolves into a village), shaped by the kind of work done, plus XP per day with a daily cap. Vision: `docs/design.md` "Next: living ecosystems".
Branch: `main` (user commits; Claude's `git commit` is denied by the user's settings). Delivery: ask-on-risk. Test runner: `bun test`.

## Specs

- S1 — User quote: "que no fuera un solo arbol por repo, sino que a medida que en un repo crece, organicamente crezca otro arbol, y cada repo sea un bosque independiente, que organicamente vaya creciendo, incluso que evolucione hasta una aldea o algo asi". Each project's ecosystem is derived only from its own events; trees multiply as it is tended; eras: clearing → grove → wood → forest → hamlet → village.
- S2 — User quote: "solito la ia el agente vea que ponerle dependiendo de la tarea, si deja crecer al arbol, o si siebra uno nuevo". The kind of work decides the growth. Source (decided by Claude, explained to the user): the conventional commit type the agent writes (`feat`, `fix`, `refactor`, `test`, `docs`, …); passing test runs count as tests. Only the type is stored, never the message (P8).
- S3 — User quote: "como un ecosistema que va evolucionando solito, incluso con sus animales y todo". Animals arrive; nothing is ever placed by hand; nothing wilts (P3).
- S4 — User quote: "pero que sea super satisfactorio verlo crecer" / "que sea satisfactorio totalmente, que te haga feli". The web view shows the richer world, with stable, deterministic placement.
- S5 — User quote: "ademas con puntos de experiencia que vaya recolectando por ir terminando tareas". User's choice: "Por día con tope": each finished task adds XP by its kind, with a daily cap; after-hours work earns none (P4); levels from total XP; XP never decays, no leaderboard.
- S6 — User quote: "recordando que esta app sea escalable y mantenible porque se tieen pensado evolucionar mas". Growth rules live in the pure domain (deterministic, replayable from events); themes only paint; tilesets are swappable data.

## Tasks

| ID  | Specs      | Route  | Status                                       | Commit      |
| --- | ---------- | ------ | -------------------------------------------- | ----------- |
| T1  | S2, S5, S6 | inline | done (RED → GREEN, work + xp tests)          | uncommitted |
| T2  | S1, S3, S6 | inline | done (13 ecosystem tests)                    | uncommitted |
| T3  | S2         | inline | done (git subject → type only, privacy test) | uncommitted |
| T4  | S1, S5     | inline | done (renderWorld tests)                     | uncommitted |
| T5  | S3, S4     | inline | done (6 layout tests)                        | uncommitted |
| T6  | S4         | inline | done (browser: desktop, mobile, time travel) | uncommitted |

T1 domain work kinds + XP. T2 domain ecosystem. T3 git commit types + use cases. T4 CLI status. T5 web ecosystem theme with Tiny Farm + Tiny Town (CC0). T6 browser verification with time travel, docs.

Route evidence: inline (no Writer trigger: one sequential feature, opencode-worker quota exhausted earlier in the session).

## Log

- L1 (2026-11-06, user, verbatim): "no aplicalo ahora, recordando que esta app sea escalable y mantenible porque se tieen pensado evolucionar mas"
- L2 (2026-11-06): XP decision via question: "Por día con tope (Recomendado)".
- L3: Kenney Tiny Farm (CC0, 2026) downloaded: animals (sheep, cow, chicken), people, solid pine, sunflower, berry bush, rocks, well, barn. Complements Tiny Town (houses).
- L4: Built. Domain: `WorkKind` from conventional commit types (`workKindOfCommitSubject`, only the type is kept), `xpLedger` (XP by kind, daily cap 100 across projects, tests once per project and day, none after hours) and `levelFor` (n × 100 XP per level), `buildEcosystem`/`buildWorld` (eras 0/3/10/25/45/80 tended days; feature plants, refactor nurtures, fix blooms, tests bring animals from grove on, docs lay paths, chore grows bushes; cabin + well at hamlet, houses at village; bounded; deterministic via `seed.ts`). Git: `GitCommitLog` reads `%ct%x09%s`, keeps the type only; events carry optional `work` (additive under v1). CLI status renders the world with level and XP. Web: Forest theme rebuilt as one pixel-art card per ecosystem (`layoutEcosystem` pure + `sprites.ts` catalogue + canvas painter), level/XP bar in the header, Tiny Farm (CC0) vendored and credited. 214 tests. Verified in the browser with time travel (day 21 and 95), on mobile (one card per row, no overflow, no console errors), and `bitgrove status` against the real save (read only).
- L5: Follow-ups: overnight message still reports per-project stage growth; it should report what arrived ("a sheep arrived in api", era changes). Animations. Commits are the user's (Claude's `git commit` is denied).
