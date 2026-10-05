---
name: add-game
description: Designs the spec for a new playable arcade game (engine port, canvas component, catalog row, Supabase leaderboard and player integration). Interviews the user like /spec, then saves specs/NN-juego-<id>.md. Use it to add a new game to Arcade Vault, with or without a reference in references/started-games/.
disable-model-invocation: true
argument-hint: "<carpeta de references/started-games o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), mcp__supabase__list_tables, mcp__supabase__execute_sql
---

# /add-game — Spec designer for new games

## Session context

Today's date (use it for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Reference games available:
!`ls references/started-games/ 2>/dev/null || echo "No references/started-games folder"`

Game engines already ported:
!`ls lib/games/ 2>/dev/null || echo "No lib/games folder"`

---

This skill produces **one spec** that, once implemented with `/spec-impl`, adds a new game to Arcade Vault: ported engine, client canvas, catalog entry in Supabase, player integration and a working leaderboard. **You don't write code and don't touch the database here.** You only interview, analyze the reference and save the spec file.

The canonical models are `specs/05-juego-asteroides.md` (engine port + player) and `specs/06-leaderboard-y-catalogo-supabase.md` (`games`/`scores`, `submitScore`). The new spec must follow their conventions.

## Step 0 — Read the `/spec` skill (mandatory)

Before anything else, read `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` (fallback: `.agents/skills/spec/`). Follow its rules as if you were running it: phases, question blocks with `AskUserQuestion`, valid states, numbering, date rules, `specs/.spec-config.yml` seeding, no code, no proposing implementation after saving. This skill only adds the game-specific parts below. Replies in the language of the initial prompt; the spec in the language of existing specs (Spanish).

## Phase 1 — Project context

Read, in this order, stopping on what doesn't exist:

1. `CLAUDE.md` (and `AGENTS.md`).
2. `specs/05-juego-asteroides.md` and `specs/06-leaderboard-y-catalogo-supabase.md`, plus the latest spec in `specs/` for numbering and wording.
3. `components/game-player.tsx`, `components/asteroids-canvas.tsx`, `lib/games/asteroids/*` (the reference implementation of the engine pattern).
4. `app/juegos/[id]/jugar/actions.ts` (`submitScore`) and `lib/games-repo.ts`.
5. `supabase/migrations/*` and, if available, `list_tables` to see the real `games` rows (id, `sort_order`, category, color, cover).
6. `.cover-*` classes in `app/globals.css`.
7. Whether `lib/games/registry.ts` exists (see "Game registry" in the template).

## Phase 2 — Analyze the game reference

`$ARGUMENTS` is either:

- **A folder name under `references/started-games/`** (e.g. `03-tetris`): read its `README.md`, `CLAUDE.md`, `game.js` (and `levels.js`, `style.css`, `assets/` if present). Extract mechanics, constants, scoring, controls, lives/levels, win/lose conditions, what the original draws on canvas (HUD, overlays), globals and DOM access (`getElementById`). **The code is the source of truth over the README.**
- **A free-text description**: no reference code. Ask for mechanics, controls, scoring, lives/levels and end condition before continuing.
- **Empty**: ask for a one-sentence description or which reference folder to use.

If the game can't be described in one sentence, or is really two games, propose splitting it.

## Phase 3 — Questions (blocks of 3–5)

Never skip this phase. Ask with `AskUserQuestion`, recommendation first, 2–4 options, only about what the code/context did not answer:

- **Catalog:** does it replace an existing placeholder row in `games` (e.g. `caida`, `bloque-buster`) or is it a new row? Final `id` slug (must match the route), title, `short`/`long` texts, `category` (`ARCADE|PUZZLE|SHOOTER|VERSUS`), `color` (`cyan|magenta|yellow|green`), `sort_order`, cover (reuse existing `.cover-*` or new `.cover-<id>`). If the id already exists and it is not a replacement, ask.
- **HUD:** lives yes/no, level from the engine or derived, extra stats; what stays drawn on canvas (only what React HUD can't show).
- **Controls and input:** keys, which ones get `preventDefault`, two-player or CPU modes in or out.
- **End and score:** end condition, how score is computed, range must fit 0–9.999.999.
- **Mechanics changes:** anything from the original to drop or alter (default: none; no new mechanics).
- **Closed decisions** the user doesn't want reopened.

Stop when you can answer: which files appear/change, what the first and last executable steps are, how it is verified.

## Phase 4 — Write the spec

Use `game-spec-template.md` (same directory as this skill) as the shape. Header like specs 05/06: Estado `Borrador`, `Depende de: SPEC 05, SPEC 06` (verify they exist in `specs/`), date from session context, one-sentence **Objetivo**. If information is complete, write the full spec without section-by-section confirmation; otherwise follow `/spec`'s section-by-section fallback.

Rules:

- Concrete file names and real identifiers; short snippets only for types/SQL, no full functions.
- Acceptance criteria are boolean and verifiable; every step of the plan leaves the system working.
- Do not include in the plan anything outside the scope; list deferred items in "No incluido".
- Include decisions taken **and discarded**, and risks.

## Phase 5 — Save

1. Next number = highest in `specs/` + 1, zero-padded.
2. Slug: `juego-<id>` → `specs/NN-juego-<id>.md`. Don't ask permission or file name; only ask if the file already exists.
3. State `Borrador`. Never `Aprobado`.
4. If `specs/.spec-config.yml` is missing, seed it as `/spec` describes; never overwrite it.
5. Confirm briefly: path, state Borrador, reminder to re-read and approve, next step `/spec-impl NN-juego-<id>`. **Stop there.**

## Hard rules

- No code, no migrations, no edits outside `specs/` during this command.
- Don't assume unconfirmed decisions; ask in Phase 3.
- Only `execute_sql` for read-only `select`.
- Never propose implementing after saving.
