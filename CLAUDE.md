# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Arcade Vault: a retro-styled web platform for playing browser arcade games and competing on score leaderboards ("Salón de la Fama"). It is built with **Spec Driven Design** — every feature starts as a spec in `specs/` and is implemented with `/spec-impl` (see **Skills & automation**).

Current state: specs `01`–`09` are implemented (`specs/03-about-page-contacto.md` is the only one still marked `Implementar`). The app has seven real routes, a Supabase-backed catalog and leaderboard, and **four playable games** with real engines: (see `references/catalogo-juegos.md`) . Auth is still simulated (see **Routes**).

Specs are written in Spanish, as are code comments. Keep both when adding to them.

## Commands

- `npm run dev` — dev server (also regenerates `AGENTS.md`, see that file)
- `npm run build` — production build
- `npm run start` — run a production build
- `npm run lint` — ESLint (flat config: `eslint-config-next` core-web-vitals + typescript + `eslint-config-prettier`; `references/**` is ignored)
- `npx prettier --write <path>` — formatting (100 cols, double quotes, trailing commas)

There is no test runner. Features are verified by hand in the browser, usually through the Playwright MCP server; screenshots go in `.playwright-screenshot/`.

## Routes (`app/`)

| Route                | Page            | Notes                                                                                                        |
| -------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `/`                  | `HomeView`      | Landing; first 6 games from `getGames()`                                                                     |
| `/biblioteca`        | `LibraryView`   | Catalog: search + category chips + `GameCard` grid                                                           |
| `/juegos/[id]`       | detail          | Cover, stats, per-game `Leaderboard`                                                                         |
| `/juegos/[id]/jugar` | `GamePlayer`    | HUD + CRT arena + game-over modal; `submitScore` action                                                      |
| `/salon`             | Hall of Fame    | Per-game tabs, `Podium` (top 3), full ranked table                                                           |
| `/acerca-de`         | About + contact | `sendContact` action (Resend)                                                                                |
| `/auth`              | login/signup    | **Simulated**: writes `av_user` to `localStorage` via `lib/session.ts`. No Supabase Auth, no password check. |

Pages are Server Components that fetch through `lib/games-repo.ts` and pass data into `"use client"` view components in `components/`.

## Data layer

- `lib/supabase/server.ts` / `client.ts` — `@supabase/ssr` clients typed with `lib/supabase/database.types.ts`. Both read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with literal `process.env.NAME` access (Next only inlines that form) and throw if missing.
- `lib/games-repo.ts` — the only place that queries Supabase for reads: `getGames()`, `getGame(id)`, `getTopScores(gameId, limit)`, `getGameStats()`. Reuse these instead of adding queries to a page. Score ordering is `score desc, created_at asc` (oldest wins ties).
- `lib/data.ts` — shared types only (`Game`, `GameCategory`, `GameColor`, `GameStats`, `ScoreRow`, `CATS`). The mock catalog is gone; Supabase is the source of truth.
- `lib/format.ts` — `formatPlays()` (`12.4K`), `formatBest()`.
- Server Actions:
  - `submitScore` (`app/juegos/[id]/jugar/actions.ts`) — revalidates the arguments itself (initials `^[A-Z0-9]{1,3}$`, score integer 0–9 999 999, game must exist), then revalidates `/salon` and `/juegos/<id>`.
  - `sendContact` (`app/acerca-de/actions.ts`) — `useActionState` shape, honeypot field, Resend send.
- `supabase/migrations/` — timestamped SQL. `games` and `scores` with RLS: public `select` on both, public `insert` on `scores` only (constraints repeated in the policy). Schema changes go in a **new** migration file; never edit an applied one. The `supabase` MCP server is configured in `.mcp.json`.
- Env vars live in `.env.local` (git-ignored) and are documented in `.env.example`: Resend (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `RESEND_FROM`) and Supabase. Nothing secret gets a `NEXT_PUBLIC_` prefix.

## Game architecture

Each real game is a framework-free TypeScript engine plus a thin React wrapper. Follow this pattern when adding one (`/add-game` writes the spec for it):

1. **Engine** — `lib/games/<id>/`, split as `constants.ts` (sizes, colors, tuning), `entities.ts` (pure state + draw helpers), `engine.ts`, `input.ts`, plus `sprites.ts` / `levels.ts` when needed. `engine.ts` exports `create<Name>Game(canvas, callbacks)` returning a handle (pause, restart, destroy, …). No React, no DOM lookups by id — the canvas arrives as an argument.
2. **Canvas component** — `components/<id>-canvas.tsx`, `"use client"`, implements `GameCanvasProps` from `lib/games/types.ts`: `paused`, `restartKey`, `onScore`, `onLives?`, `onLines?`, `onLevel?`, `onGameOver`, `onTogglePause?`, `onAutoPause?`, `blockStyle?`, `muted?`, `volume?`, `jumpTo?`. Keep the callbacks in a ref so prop changes never recreate the engine, mirror `paused` into a ref, and create/destroy the engine in a Strict-Mode-safe `useEffect`.
3. **Registry** — add a `GameEntry` to `GAME_REGISTRY` in `lib/games/registry.ts`: `Canvas`, `controls` (for the controls hint), `engineLevel`, `hasLives`, and optionally `hasLines`, `blockStyles`, `aspect` (default `4 / 3`), `hasSound`, `levelJump`. `GamePlayer` drives the HUD entirely from this entry; an id with **no** entry keeps the simulated placeholder.
4. **Catalog + assets** — a row in the `games` table whose `id` equals the route segment, a `.cover-<id>` class (or a reused one) in `app/globals.css`, and binaries under `public/games/<id>/`.

Only draw on canvas what the React HUD cannot show.

## Design reference: `references/`

Not part of the Next.js build, and excluded from ESLint, Prettier and the format hook. It is the visual/UX source of truth — port from it rather than designing from scratch.

- `templates/` — the original standalone React+Babel CDN prototype (`Arcade Vault.html` opens directly in a browser): `data.jsx`, `app.jsx` (hash router + `localStorage` session, a prototype substitute for routing/auth, not a pattern to copy), `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `salon.jsx`, `auth.jsx`, and `styles.css` — the full retro/neon design system (CSS custom properties, glow, scanline/CRT textures, pixel font) that `app/globals.css` is derived from.
- `templates/home-about/` — `home.jsx` and `about.jsx`, the sources of `/` and `/acerca-de`.
- `started-games/` — the original playable JS games ported into `lib/games/`: `02-asteroids`, `03-tetris`, `04-arkanoid`. Their **code is the source of truth over their READMEs**.
- `source-assets/` — raw art, e.g. `snake-assets/` (fruit spritesheet).

## Skills & automation

Workflow skills live in `.claude/skills/` (mirrored in `.agents/skills/` so other agents can read them); they come from `Klerith/fernando-skills` (`skills-lock.json`, `npx skills@latest add Klerith/fernando-skills`).

- `/spec <description>` — interviews first, then writes `specs/NN-slug.md` in state `Borrador`. Writes no code.
- `/spec-impl NN-slug` — refuses unless the state means **Approved** (`Aprobado`/`Approved`); creates and switches to branch `spec-NN-slug`, then implements the plan step by step pausing for diff review. It never commits on its own. Branch creation is governed by `AutoCreateBranch` in `specs/.spec-config.yml` (currently `true`).
- `/add-game <started-games folder | description>` — project-specific skill that wraps `/spec` for new games: analyzes the reference, asks about catalog row / HUD / controls / scoring, and saves `specs/NN-juego-<id>.md`. Canonical models: `specs/05-juego-asteroides.md` and `specs/06-leaderboard-y-catalogo-supabase.md`.
- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.

A `PostToolUse` hook in `.claude/settings.json` runs `.claude/hooks/format.mjs` after every Write/Edit: it strips trailing whitespace, then `prettier --write`, then `eslint --fix` for code files, and **fails the tool call** on a lint error. Don't hand-format files, and fix reported lint errors rather than working around the hook.

## Stack notes

- Next.js 16.3.6 App Router, React 19.2, TypeScript, Tailwind CSS v4 (CSS-first config via `@theme inline` in `app/globals.css` — a ~3000-line design system, no `tailwind.config.*` file).
- `@supabase/ssr` + `@supabase/supabase-js`, `resend`.
- `tsconfig.json` uses `@/*` path aliases rooted at the repo root.
- Route prop types (e.g. `LayoutProps<"/">` in `app/layout.tsx`) come from Next's generated `.next/types` — check the App Router API reference under `node_modules/next/dist/docs/01-app/03-api-reference/` when working with route/layout/page prop typing, since this is a newer convention.
