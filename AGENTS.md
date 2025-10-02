## 注意！！！！
总是用中文进行回答！！！！！

# Repository Guidelines

This repository powers the Claude Code Electron installer. Use these notes to stay aligned with existing patterns and keep builds healthy.

## Project Structure & Module Organization
- `src/main`, `src/preload`, and `src/renderer` host Electron processes, preload bridges, and the React UI respectively; share utilities live in `src/shared`.
- Feature-specific wizards reside in `src/installer`; reusable assets and configuration live under `assets/` and `config/`。跨进程共享常量集中在 `src/shared/config/catalog.ts`，安装流程定义位于 `src/shared/workflows/map.ts`。
- Automated tests live in `tests/` (unit, integration, e2e) with scenario specs in `specs/` and references in `docs/`.

## Build, Test, and Development Commands
- `npm run dev` spins up renderer, main watcher, and Electron for interactive development.
- `npm run build` produces production bundles for renderer, main, and preload code; pair with `npm run build:electron` for distributables.
- `npm start` boots the compiled Electron app from `build/main/main.js`.
- `npm test`, `npm run test:watch`, and `npm run test:e2e` cover Jest unit suites and Playwright end-to-end checks；契约测试位于 `tests/contract`，应在共享配置 / IPC 变更后优先修复。
- `npm run lint`, `npm run format:check`, and `npm run typecheck` enforce ESLint, Prettier, and TypeScript gates.

## Coding Style & Naming Conventions
- TypeScript throughout; let Prettier (2-space indent, single quotes) format files via `npm run format`.
- Prefer `PascalCase` for React components, `camelCase` for functions/variables, and suffix hooks with `use*`.
- Keep modules cohesive: colocate domain logic under `src/shared` utilities and expose via `index.ts` barrels only when necessary。跨进程常量必须写入 `SharedConfigurationCatalog`，禁止在 main/renderer 中重复声明。

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
- Route privileged commands through existing IPC guards in `src/main` and surface user consent in the renderer UI。访问共享配置请使用 `window.electronAPI.sharedConfig.get(id)` 并校验来源 URL。

## Shared Configuration Workflow
- 新增/修改跨进程常量时，请同步更新 `src/shared/config/catalog.ts` 并运行 `scripts/audit/shared-config-usage.ts` 生成最新报表。
- 渲染层若需新增共享数据，请通过 `window.electronAPI.sharedConfig.get` / `workflowMap.sync` 获取，并在 `tests/setup.ts` 中补充 mock，确保单元测试可用。
