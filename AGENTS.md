## 注意！！！！
总是用中文进行回答！！！！！

# Repository Guidelines

This repository powers the Claude Code Electron installer. Use these notes to stay aligned with existing patterns and keep builds healthy.

## Project Structure & Module Organization
- `src/main`, `src/preload`, and `src/renderer` host Electron processes, preload bridges, and the React UI respectively; share utilities live in `src/shared`.
- Feature-specific wizards reside in `src/installer`; reusable assets and configuration live under `assets/` and `config/`.
- Automated tests live in `tests/` (unit, integration, e2e) with scenario specs in `specs/` and references in `docs/`.

## Build, Test, and Development Commands
- `npm run dev` spins up renderer, main watcher, and Electron for interactive development.
- `npm run build` produces production bundles for renderer, main, and preload code; pair with `npm run build:electron` for distributables.
- `npm start` boots the compiled Electron app from `build/main/main.js`.
- `npm test`, `npm run test:watch`, and `npm run test:e2e` cover Jest unit suites and Playwright end-to-end checks.
- `npm run lint`, `npm run format:check`, and `npm run typecheck` enforce ESLint, Prettier, and TypeScript gates.

## Coding Style & Naming Conventions
- TypeScript throughout; let Prettier (2-space indent, single quotes) format files via `npm run format`.
- Prefer `PascalCase` for React components, `camelCase` for functions/variables, and suffix hooks with `use*`.
- Keep modules cohesive: colocate domain logic under `src/shared` utilities and expose via `index.ts` barrels only when necessary.

## Testing Guidelines
- Jest is configured with `tests/setup.ts`; name specs `*.test.ts(x)` either beside code or under the matching folder in `tests/`.
- Maintain ≥80% coverage (branches, functions, lines, statements) per `jest.config.js`; run `npm run test:coverage` before submitting.
- For UI flows, add Playwright specs in `tests/e2e` and record flaky scenarios in `tests/performance` or `specs/` as applicable.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat: 描述` or `fix: 描述`) as seen in history; keep messages concise and scoped to one change.
- Before opening a PR, ensure lint, tests, and type checks pass; attach logs or screenshots for UI-affecting changes.
- Reference related issues, describe user impact, and note any follow-up tasks; request review from module owners listed in `CLAUDE.md` if relevant.

## Security & Configuration Tips
- Configuration bundles ship from `config/` and `scripts/`; keep secrets out of git and rely on documented `.env` overrides.
- Route privileged commands through existing IPC guards in `src/main` and surface user consent in the renderer UI.
