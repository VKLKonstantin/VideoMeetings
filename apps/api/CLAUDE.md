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

To run a single unit test file: `npx jest src/app.controller.spec.ts` (or `npx jest app.controller` — matches by path/name). To run a single test by name: `npx jest -t "test name"`.

## Architecture

Default NestJS CLI scaffold, unmodified beyond generation: single `AppModule` wiring `AppController` → `AppService`, entrypoint in `src/main.ts`. No additional modules, controllers, or providers yet.
