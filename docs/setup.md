# Setup walkthrough

The project lives at /home/yyk/Documents/Codex/bank-simulator.
Do not regenerate it in place; these commands document how the scaffold was made.

```bash
mkdir -p /home/yyk/Documents/Codex/bank-simulator
cd /home/yyk/Documents/Codex/bank-simulator
npx --yes @nestjs/cli@12.0.8 new bank-simulator \
  --directory . --package-manager npm --language TypeScript \
  --strict --no-observe --skip-install --skip-git
```

Originally selected **CJS (CommonJS), with Jest** at the prompt. The project was
subsequently changed to native ESM; use the existing repository rather than
replaying the CLI command. `--directory .` used the existing folder; `--skip-install`
let us change dependencies before installation.
`--no-observe` leaves hosted observability out of this local scaffold.

Before running `npm install`, edited the generated files:

- Replaced @nestjs/platform-express with @nestjs/platform-fastify.
- Removed Express/Supertest types, Supertest, and the unused deployment package.
- Replaced Hello World files with the health controller and shared Fastify factory.
- Added strict property initialization, checked indexed access, exact optional
  properties and unknown catch values to TypeScript options.
- Replaced generated tests with Fastify inject tests and simplified Jest configuration.
- Added .gitignore, .nvmrc and project-specific documentation.

```bash
npm install
git init -b main
npm run format
npx prettier --write '*.json' jest.config.ts
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test -- --runInBand
```

The automation shell did not load NVM, so commands there explicitly prepended the
installed Node bin directory to PATH. npm's cache was placed in the chat's scratch
workspace. Your terminal can use `nvm use` instead; neither setting is a project
runtime dependency.

No GitHub repository, remote, push or commit is created by this setup.

## Verification results

Build, type checking, lint and formatting checks passed. Both Fastify HTTP tests
passed. The compiled server was started, returned HTTP 200 with `{"status":"ok"}`
at /health/live, and was stopped after the check. No server is left running.

The production start script points to dist/main.js, matching tsconfig.build.json.
The first CJS setup used the generated template's --experimental-vm-modules flag
because the installed Nest 12 packages use ESM. Node prints an experimental
warning. The native ESM setup below also requires the flag, per Jest's ESM docs.

Installed versions: Nest core/Fastify adapter 12.1.2, TypeScript 6.0.3, Jest 30.5.2.
The lockfile records all exact versions.

Additional inspection commands included npm view @nestjs/cli version,
npx --yes @nestjs/cli@12.0.8 new --help, npm audit --json,
npm audit --omit=dev, and npm ls with the main package names.
The runtime dependency audit reported zero vulnerabilities. The full audit
reported 20 moderate affected-package entries propagated through the Jest
development toolchain from a sprintf-js denial-of-service advisory. npm suggested
breaking test-tool downgrades; those were not applied.

The first bulk source edits were performed with a temporary Python script, which
was a file-editing convenience only. Python is not a project dependency. Subsequent
corrections used explicit file patches. Documentation was written with shell
heredocs. The compiled-server smoke check used a temporary Node script to start
the process, request the health route, and stop it.

## Native ESM conversion

The project now follows Nest's ESM default while retaining Jest from the design
document. These are the changes already made, so do not repeat them by hand in
this repository:

1. Added `"type": "module"` to package.json. The existing NodeNext TypeScript
   module and resolution settings already support ESM.
2. Added `.js` to relative imports in source and tests. TypeScript resolves the
   `.ts` source; Node loads the emitted `.js` file after compilation.
3. Replaced `jest.config.ts` with `jest.config.cjs`. That file uses ts-jest's ESM
   preset and maps `.js` test imports back to TypeScript source files. The `.cjs`
   extension makes only Jest's configuration CommonJS.
4. Removed the duplicate end-to-end Jest JSON file. Both test commands use one
   config; the end-to-end command selects its test file.
5. Updated the debug and formatting scripts, then refreshed package-lock.json.

The migration and verification commands were:

```bash
npm install --package-lock-only --ignore-scripts --offline
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run start:dev
curl --fail http://127.0.0.1:3000/health/live
```

The build, checks, tests and compiled server succeeded. `npm run start:dev`
started the ESM application and the health request returned `{"status":"ok"}`;
the development server was then stopped with Ctrl+C. An earlier pair of parallel
Jest runs collided in the same transform cache. A single isolated rerun passed;
run the two test commands one after the other.

For your daily work, the short sequence is:

```bash
cd /home/yyk/Documents/Codex/bank-simulator
nvm use
npm ci
npm run start:dev
```

Run `npm ci` once on a new checkout or after the lockfile changes. It is not
necessary before every start. For verification, use `npm run build`,
`npm run typecheck`, `npm run lint`, and `npm test -- --runInBand`.
