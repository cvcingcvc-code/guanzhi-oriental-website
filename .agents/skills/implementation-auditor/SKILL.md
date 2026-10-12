---
name: implementation-auditor
description: Audit whether a completed implementation truly works across UI, frontend state, API, route, service or repository, and database, including errors, permissions, tests, and quality gates. Use after feature, CMS, API, or database work when the user asks to review, verify completion, or check whether it is really done. Do not use for pre-development planning, database-only persistence diagnosis, security-only audits, routine commit readiness, or general handoffs.
---

# Implementation Auditor

## Reconstruct the target

1. Read applicable `AGENTS.md`; otherwise read `README.md` and `CONTRIBUTING.md`.
2. Read `git status`, `git diff`, `git diff --staged`, and the affected source and tests. Include untracked implementation files. Do not infer the goal from filenames alone.
3. Read relevant architecture and contract docs, but verify their claims against current code.

## Verify the execution path

Trace the real path end to end:

`UI -> React state/API client -> HTTP API -> Fastify route -> service/repository -> Drizzle -> PostgreSQL -> response -> rendered state`

- Confirm request and response structures, Zod validation, locale and fallback semantics, status codes, and frontend error handling.
- Confirm write results are subsequently read through the production path, not merely returned from a mock.
- Inspect authentication, `ADMIN`/`EDITOR` authorization, protected route registration, audit events, ID ownership, and bypass routes.
- Inspect schema compatibility, migration presence when schema changed, constraints, transactions, row locks, optimistic revision conflicts, and rollback behavior.
- Exercise negative paths and regression-sensitive behavior. Code presence is not completion evidence.

## Run gates

- Run `npm run build` at repository root for frontend typecheck/build.
- Run `node --test tests/*.test.js` when root tests are relevant; there is currently no root `test` script.
- Run `npm run typecheck`, `npm test`, and `npm run build` in `backend/`.
- Run `git diff --check`.
- Run lint only if current package scripts/config provide it; otherwise report `未配置`.

If a required service or safe test database is unavailable, report the unverified item precisely. Do not modify production or valuable local data merely to make the audit pass. Do not fix findings unless asked.

## Output

Use exactly these sections:

【审计结论】

【已验证】

【发现问题】

【测试结果】

【权限】

【数据库】

【遗留风险】

【建议下一步】
