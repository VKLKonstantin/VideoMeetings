# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

npm workspaces monorepo with two apps:

- `apps/web` — Next.js 16 (App Router) + React 19 + Tailwind v4. Has its own `CLAUDE.md`/`AGENTS.md` — **read those before touching this app**, they contain a Next.js version warning (this version has breaking changes vs. training data; consult `node_modules/next/dist/docs/` before writing Next.js code).
- `apps/api` — NestJS 11. See `apps/api/CLAUDE.md`.

Both apps are early-stage scaffolds (default `create-next-app` / `nest new` output) — no routes/modules beyond the defaults, and no wiring between web and api yet.

Node version is pinned via `.nvmrc` to `22.12.0`.

A HeroUI React skill is installed under `.agents/skills/heroui-react` — use it when building UI components in `apps/web`.

## Commands

Run from the repo root (workspaces-aware):

- `npm install` — installs all workspaces
- `npm run dev` — runs both apps concurrently (web + api)
- `npm run dev:web` / `npm run dev:api` — run a single app
- `npm run build` — builds all workspaces that define a `build` script
- `npm run lint` — lints all workspaces
- `npm run format` — formats all workspaces
- `npm run test` — runs tests in all workspaces

To target one workspace directly, add `-w web` or `-w api`, e.g. `npm run build -w api`. For running individual tests, see `apps/api/CLAUDE.md`.

## Keeping docs in sync

When a change alters the project's architecture (new module/app, changed data flow between `apps/web` and `apps/api`, new external dependency that shapes how the app is built, changed commands/scripts), update the relevant `CLAUDE.md` (root and/or `apps/*/CLAUDE.md`) in the same change — don't let this file drift from the actual structure.
