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
- `src/recordings/` — feature module for meeting recording uploads (imports `MeetingsModule`, needs its exported `MeetingsService`):
  - `entities/recording.entity.ts` — `{ id, meetingId, filename, size, format, status, uploadedAt, storedPath }`. `status` is `'uploaded' | 'processing' | 'done' | 'error'`. `storedPath` (absolute disk path) is internal-only — `RecordingsService` strips it before returning a `PublicRecording` from either route.
  - `recordings.repository.ts` — repository pattern, in-memory (same reset-per-process caveat as `MeetingsRepository`); stores metadata only, never the file bytes.
  - `recordings.storage.ts` — `RecordingsStorage`, separates binary storage from metadata (mirrors how `MeetingsRepository` is separate from meeting data access). Local disk under `apps/api/storage/recordings/<meetingId>/<uuid>.<ext>` (gitignored) — swapping this for S3/MinIO later shouldn't require touching the service/controller. `persist()` moves a file from the tmp upload dir into this layout; `discard()` deletes a rejected tmp file.
  - `recordings.multer-options.ts` — `multer` `diskStorage` config for `FileInterceptor`: writes uploads to `storage/recordings/tmp` under a server-generated UUID filename (never the client's original filename — avoids path traversal/collisions), `fileFilter` does a cheap mimetype pre-check (`ALLOWED_RECORDING_MIME_TYPES` in `recordings.constants.ts`), `limits.fileSize` caps at `MAX_RECORDING_SIZE_BYTES` (env-overridable via `RECORDING_MAX_SIZE_BYTES`, default 500 MB).
  - `file-signature.util.ts` — `detectMediaFormat()`, the authoritative format check: sniffs magic bytes (first 64 bytes read from disk, not the whole file) to identify `mp3`/`wav`/`ogg`/`mp4`/`mov`/`webm` rather than trusting the client-supplied mimetype (spoofable). A file whose content doesn't match a known signature is rejected even if the declared mimetype passed the `fileFilter` pre-check.
  - `recording-too-large.filter.ts` — `RecordingTooLargeFilter`, an `ExceptionFilter` that normalizes multer's `LIMIT_FILE_SIZE` → `PayloadTooLargeException` (413, Nest's default mapping) down to 400, since oversized uploads should be rejected the same way as any other validation failure.
  - `meeting-owner.guard.ts` — `MeetingOwnerGuard`, checks the `:id` route param against `req.user.id` via `MeetingsService.findOneForOwner` (reusing its no-existence-leak 404). Runs as a guard — before `FileInterceptor` — so an unauthorized upload is rejected before multer writes anything to disk.
  - `recordings.service.ts` — `RecordingsService.createFromUpload()`: detects the real format, discards the tmp file and throws `BadRequestException` (400) if unrecognized, otherwise moves it into permanent storage via `RecordingsStorage` and creates the repository record with `status: 'uploaded'`. `findAllForMeeting()` lists a meeting's recordings.
  - `recordings.controller.ts` — `@Controller('meetings/:id/recordings')`, guarded by `AuthGuard` + `MeetingOwnerGuard`. `POST` (`FileInterceptor('file', ...)`, field name `file`) uploads a recording; `GET` lists them.
  - `test/recordings.e2e-spec.ts` — e2e coverage: successful upload + list, multiple recordings per meeting, invalid format rejected without saving, oversized file rejected without saving, owner isolation (404) on both routes, 401 without auth. Uses `test/setup-env.ts` (wired via `jest-e2e.json`'s `setupFiles`) to set `RECORDING_MAX_SIZE_BYTES=1MB` so the oversized-file test doesn't need to allocate hundreds of MB.
  - See [docs/research-meeting-upload.md](../../docs/research-meeting-upload.md) for the technology choices behind this module (diskStorage vs memoryStorage, why magic-byte sniffing over trusting mimetype, local disk vs object storage, the Phase 2 processing-queue seam).

All screenshots save to /screenshot folder
