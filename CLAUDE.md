# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Arcade Vault: a retro-styled web platform for playing browser arcade games and competing on score leaderboards ("Salón de la Fama"). The project is being built with **Spec Driven Design** using the `/spec` and `/spec-impl` workflow from the `Klerith/fernando-skills` skill pack (see README.md). Install it with `npx skills@latest add Klerith/fernando-skills` if the `/spec` and `/spec-impl` commands aren't available yet.

The repo is currently a bare `create-next-app` scaffold — `app/page.tsx` and `app/layout.tsx` still hold the default template content. No real app routes, components, or data layer exist yet.

## Commands

- `npm run dev` — start the dev server (also regenerates `AGENTS.md`, see below)
- `npm run build` — production build
- `npm run start` — run a production build
- `npm run lint` — ESLint (flat config: `eslint-config-next` core-web-vitals + typescript rules)

There is no test runner configured in this repo.

## Design reference: `references/templates/`

This directory is a standalone, framework-free HTML/JS prototype (React + Babel loaded from CDN, no build step — open `Arcade Vault.html` directly in a browser) that acts as the **UX/visual spec** for the real Next.js app. It is not part of the Next.js build and imports nothing from `app/`. When implementing screens under `app/`, port the structure/behavior from these files rather than designing from scratch:

- `data.jsx` — mock domain data: the `GAMES` catalog (id, title, category, cover, best score, play count), `CATS` categories, and `seededScores()` for generating deterministic fake leaderboard rows.
- `app.jsx` — root component; hash-based client router (`#<json route>`) switching between five screens, plus `localStorage`-backed session (`av_user`) and score persistence (`av_scores`). This is a prototype substitute for real routing/auth/persistence, not a pattern to copy literally into App Router.
- `nav.jsx` — top nav + mobile slide-out panel.
- `biblioteca.jsx` — the game library/home screen: search + category filter chips + game card grid (`GameCard`, with a mouse-tilt hover effect).
- `detalle.jsx` — game detail screen: cover, description, stats, and a per-game leaderboard sidebar.
- `reproductor.jsx` — the gameplay screen: HUD (score/lives/level), a CRT-styled arena placeholder, pause state, and a game-over modal that captures initials and saves the score.
- `salon.jsx` — Hall of Fame: per-game tabs, a top-3 podium, and a full ranked table, highlighting the current user's row if logged in.
- `auth.jsx` — login/signup card with tabs, a guest-play option, and (non-functional) social login buttons.
- `styles.css` — the full retro/neon design system (CSS custom properties for colors, glow effects, scanline/CRT textures, pixel font usage) referenced by all the above.

The five screens map to the routes the real app should eventually expose: library (home), game detail, game player, auth, and hall of fame.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario

## Stack notes

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (CSS-first config via `@theme inline` in `app/globals.css`, no `tailwind.config.*` file).
- `tsconfig.json` uses `@/*` path aliases rooted at the repo root.
- Route prop types (e.g. `LayoutProps<"/">` in `app/layout.tsx`) come from Next's generated `.next/types` — check the App Router API reference under `node_modules/next/dist/docs/01-app/03-api-reference/` when working with route/layout/page prop typing, since this is a newer convention.
