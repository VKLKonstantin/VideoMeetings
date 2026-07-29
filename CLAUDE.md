# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

Yarn workspaces monorepo with two apps:

- `apps/web` — Next.js 16 (App Router) + React 19 + Tailwind v4. Has its own `CLAUDE.md`/`AGENTS.md` — **read those before touching this app**, they contain a Next.js version warning (this version has breaking changes vs. training data; consult `node_modules/next/dist/docs/` before writing Next.js code).
- `apps/api` — NestJS 11. See `apps/api/CLAUDE.md`.

`apps/api` has a `meetings` module and an `auth` module (`POST /auth/register`, `POST /auth/login`) — see `apps/api/CLAUDE.md`. The `meetings` routes are behind a bearer-token `AuthGuard`; there's still no real token issuer — both auth endpoints return the user's id as `token`, which doubles as the fake bearer value `AuthGuard` expects. `apps/web` has a `/register` page (`apps/web/app/register/page.tsx`) and an `/auth/login` page (`apps/web/app/auth/login/page.tsx`, note the inconsistent route nesting vs. `/register`) that call `POST /auth/register` / `POST /auth/login` on the API — the wiring between the two apps, via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`). On successful login the web app stores the token in `localStorage` (`authToken`) and redirects to `/`; nothing reads it back out yet (no protected pages or authenticated API calls from `apps/web` so far). `apps/api` enables CORS for the web dev origin (`WEB_ORIGIN`, defaults to `http://localhost:3000`).

Node version is pinned via `.nvmrc` to `22.12.0`.

`apps/web` uses HeroUI v3 (`@heroui/react`, `@heroui/styles`) for UI components — no provider needed, compound component API (e.g. `Card.Header`), `onPress` not `onClick`. A HeroUI React skill is installed under `.agents/skills/heroui-react` — use it when building UI components in `apps/web`.

## Commands

Run from the repo root (workspaces-aware):

- `yarn install` — installs all workspaces
- `yarn dev` — runs both apps concurrently (web + api)
- `yarn dev:web` / `yarn dev:api` — run a single app
- `yarn build` — builds both workspaces
- `yarn lint` — lints both workspaces
- `yarn format` — formats `apps/api` (`apps/web` has no `format` script)
- `yarn test` — runs `apps/api`'s unit tests (Jest, `*.spec.ts` files colocated with source); `apps/web` has no automated tests yet, so it isn't wired into this script.

To target one workspace directly, use `yarn workspace web <script>` or `yarn workspace api <script>`, e.g. `yarn workspace api build`.

**e2e tests are not wired to a root script** — they only exist for `apps/api` and must be run from there: `yarn workspace api test:e2e` (or `cd apps/api && yarn test:e2e`). See `apps/api/CLAUDE.md` for the full test commands (including running a single file/test) and what the test suites cover.

## Keeping docs in sync

When a change alters the project's architecture (new module/app, changed data flow between `apps/web` and `apps/api`, new external dependency that shapes how the app is built, changed commands/scripts), update the relevant `CLAUDE.md` (root and/or `apps/*/CLAUDE.md`) in the same change — don't let this file drift from the actual structure.
