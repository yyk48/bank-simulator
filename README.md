# Bank simulator

A synthetic banking simulator for the Secure Assets Trading API. All accounts,
identities and money will be fictional. No real-bank integration is planned.

## Current increment: HTTP scaffold

NestJS, TypeScript strict mode, Fastify, Jest, and a liveness endpoint are implemented.
No database connections, account APIs, credentials, OTPs or transfers exist yet.

## Run locally

```bash
cd /home/yyk/Documents/Codex/bank-simulator
nvm use
npm ci
npm run start:dev
```

In another terminal:

```bash
curl http://127.0.0.1:3000/health/live
```

Expected: HTTP 200 with `{"status":"ok"}`. This indicates the HTTP application is
alive, not that banks or databases are ready. The current scaffold binds only to
loopback on port 3000. Environment configuration comes next; PORT is not yet read.
Stop the development server with Ctrl+C.

## Verify

```bash
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

The general test command currently includes the two HTTP tests; the e2e command
selects that same suite explicitly. Fastify injection exercises routing without
opening a TCP port. PostgreSQL integration tests will arrive with persistence.

To run compiled JavaScript: `npm run build` then `npm run start:prod`.

## Read the code in this order

1. `src/main.ts`: starts the application and opens the local HTTP listener.
2. `src/create-app.ts`: creates Nest with Fastify and installs shutdown hooks.
   Both the executable and HTTP tests use this factory.
3. `src/app.module.ts`: registers the controller with Nest's dependency container.
4. `src/health/health.controller.ts`: maps GET /health/live to a typed response.
5. `test/app.e2e-spec.ts`: starts the real adapter and checks the HTTP behavior.

`@Module`, `@Controller`, and `@Get` are decorators: metadata that tells Nest how
to assemble the application and route requests. The return type on `live()` is
checked by TypeScript; it is not runtime input validation.

The application uses native ES modules: `package.json` sets `type: module`,
TypeScript uses NodeNext, and relative TypeScript imports name their emitted `.js`
files. `jest.config.cjs` is a CommonJS configuration file for the Jest tool only;
it does not change the application's module system. Jest uses ts-jest's ESM preset.
It still needs Node's `--experimental-vm-modules` flag, and Node prints a warning.

Runtime packages and development tools are listed separately in package.json;
package-lock.json records exact dependency versions. .nvmrc selects our Node
installation. No global Nest CLI installation is needed. See docs/setup.md for
the migration commands and verification record.

## Next increments

1. Validated runtime configuration and stable error handling.
2. Three explicitly selected bank DataSources, partial availability and readiness.
3. Core migrations and repeatable seeds for branches, holders and bank accounts.
4. Account authorization and verification; then approval and transfer workflows.

See docs/decisions.md for the discussion record and docs/setup.md for setup commands.
