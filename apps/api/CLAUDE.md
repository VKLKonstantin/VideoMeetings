# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from `apps/api/` (or append `-w api` when running from the repo root):

- `npm run start:dev` — dev server with watch mode
- `npm run build` — `nest build`
- `npm run lint` — eslint with `--fix` over `src`, `apps`, `libs`, `test`
- `npm run format` — prettier over `src` and `test`
- `npm test` — unit tests (Jest, config lives in `package.json`, `rootDir: src`, matches `*.spec.ts`)
- `npm run test:e2e` — e2e tests, uses `test/jest-e2e.json`
- `npm run test:cov` — unit tests with coverage

To run a single unit test file: `npx jest src/auth/password.util.spec.ts` (or `npx jest password.util` — matches by path/name). To run a single e2e test file: `npx jest --config test/jest-e2e.json test/auth.e2e-spec.ts`. To run a single test by name (either config): add `-t "test name"`.

## Architecture

`AppModule` has no controllers or providers of its own — it only imports `AuthModule` and `MeetingsModule`. (The `AppController`/`AppService` boilerplate that shipped with `nest new`, a `GET /` returning `"Hello World!"`, has been removed along with its tests; there is no root route anymore — `GET /` now 404s.) Entrypoint `src/main.ts` sets a global `ValidationPipe({ whitelist: true, transform: true })`, calls `app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001' })`, and listens on `process.env.PORT ?? 3001`.

Auth is split into two feature modules with a clear boundary: `UsersModule` owns user data (create/find, email-uniqueness invariant); `AuthModule` owns credential checks and token issuance and depends on `UsersModule` — never the other way around. They talk to each other only through `UsersModule`'s exported `UsersService`, via normal Nest constructor DI (`AuthModule` imports `UsersModule`); there's no shared repository access across the boundary.

- `src/users/` — user data, no HTTP surface of its own (no controller):
  - `entities/user.entity.ts` — `{ id, email, passwordHash, createdAt }`.
  - `users.repository.ts` — repository pattern (`arch-use-repository-pattern`); in-memory, same reset-per-process caveat as `MeetingsRepository`.
  - `users.service.ts` — `UsersService`, the only thing `UsersModule` exports. `createUser({ email, passwordHash })` enforces the email-uniqueness invariant itself (`ConflictException`, 409) and stamps `createdAt`; `findByEmail(email)` is a plain lookup. Both are synchronous (in-memory), despite `AuthService` awaiting them — safe today, and the seam to make them real `Promise`s later (e.g. a DB-backed repository) is already in place.
  - `users.module.ts` — `providers: [UsersService, UsersRepository]`, `exports: [UsersService]` (repository itself is not exported — `AuthModule`/anything else must go through the service).
- `src/auth/auth.guard.ts` — `AuthGuard` (`CanActivate`). Reads `Authorization: Bearer <userId>` and sets `request.user = { id }`; throws `UnauthorizedException` (401) otherwise. There's no real token issuer yet — the bearer value is used directly as the user id. Applied via `@UseGuards(AuthGuard)` on `MeetingsController`.
- `src/auth/` — credential checks and token issuance (imports `UsersModule`):
  - `auth.controller.ts` — `POST /auth/register` (201) and `POST /auth/login` (200, `@HttpCode(HttpStatus.OK)` since Nest's `@Post` default is 201), both public (no guard). Builds the response as `{ user, token: authService.generateToken(user) }`.
  - `auth.service.ts` — `AuthService`, injects `UsersService` (not the repository). `register` hashes the password and delegates user creation to `UsersService.createUser`. `login` looks up by (lowercased) email via `UsersService.findByEmail` and verifies the password with `verifyPassword`; throws `UnauthorizedException` (401) with the same generic message for "unknown email" and "wrong password" so the endpoint doesn't leak which emails are registered. `generateToken(user)` is the token-issuance seam — currently just returns `user.id` (see `AuthGuard` above), but gives a single place to swap in a real token issuer later.
  - `password.util.ts` — hashes passwords with Node's built-in `crypto.scrypt` (random salt per user, stored as `salt:hash`); `verifyPassword` re-derives the key with the stored salt and compares with `timingSafeEqual`. No external hashing dependency added.
  - `dto/register.dto.ts` — `class-validator` DTO (`email` via `IsEmail`, `password` via `IsString`/`MinLength(8)`).
  - `dto/login.dto.ts` — `class-validator` DTO (`email` via `IsEmail`, `password` via `IsString`, no `MinLength` — login doesn't enforce password policy, only registration does).
  - Response shape (both endpoints): `{ user: { id, email, createdAt }, token }` where `token` is the user's id — matches what `AuthGuard` expects as the bearer value, so a client can immediately call guarded endpoints (e.g. `POST /meetings`) after registering or logging in.
  - Tests: `src/auth/password.util.spec.ts` (unit, hash/verify roundtrip) and `test/auth.e2e-spec.ts` (e2e, register+login flows including the no-user-enumeration check) — both black-box against the HTTP surface, so they didn't need to change when `auth`/`users` were split.
- `src/meetings/` — feature module (`arch-feature-modules`):
  - `meetings.controller.ts` — `POST /meetings`, `GET /meetings`, `GET /meetings/:id`, all guarded by `AuthGuard` and scoped to `request.user.id`. `GET /meetings/:id` returns 404 both when the id doesn't exist and when it belongs to another user (no existence leak).
  - `meetings.service.ts` / `meetings.repository.ts` — repository pattern (`arch-use-repository-pattern`); `MeetingsRepository` is in-memory (array, resets per process/app instance) so it's trivial to swap for a real persistence layer later.
  - `dto/create-meeting.dto.ts` — `class-validator` DTO for `POST /meetings` (`title`, `date` ISO string, `participants: string[]`).
- `test/meetings.e2e-spec.ts` — e2e coverage for the three routes. Overrides `AuthGuard` with a test-only fake that authenticates via `Authorization: Bearer <userId>` so different tests can act as different users without a real token issuer.

All screenshots save to /screenshot folder