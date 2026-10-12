---
name: feature-planner
description: Plan repository-aware implementation before coding for a new feature, CMS module, API, database-backed capability, admin function, page, or substantial refactor. Use when the user asks to develop or design such work and the affected path is not yet established. Do not use for tiny isolated fixes, post-implementation audits, security-only reviews, commit preparation, or handoff summaries. Stop after the plan unless the user explicitly asks to implement.
---

# Feature Planner

## Establish repository facts

1. Read the nearest `AGENTS.md` files if present. If absent, read `README.md` and `CONTRIBUTING.md`.
2. Inspect `package.json`, `backend/package.json`, relevant source, tests, migrations, and architecture docs. Prefer `docs/content-contract.md`, `docs/homepage-cms.md`, `docs/backend/README.md`, and `docs/backend/API.md` only when relevant.
3. Treat `src/App.tsx` and `src/content/public-content.ts` as the public frontend path; treat `src/admin/` as the CMS frontend; treat `backend/src/server.ts` and `backend/src/app.ts` as the real backend. Do not mistake `public/server/index.js` or unused `src/components/` for current entry points.
4. Confirm facts from current files rather than relying on stale handoff text.

## Analyze the change

- Restate the user outcome and explicitly bound non-goals.
- Find the closest existing implementation and trace UI -> frontend state/client -> API -> route -> repository/service -> Drizzle query -> PostgreSQL.
- Identify contracts, DTOs, locale behavior, fallback behavior, media resolution, errors, and documentation that must remain consistent.
- Determine schema and migration needs without assuming every database-backed feature needs a schema change. If schema changes, require a generated migration and tests; do not modify either during planning.
- Analyze authentication, `ADMIN`/`EDITOR` authorization, public/admin boundary, audit logging, optimistic revision locking, transactions, and concurrent operations where relevant.
- Select focused unit/integration/manual tests and the repository's actual gates. Note that no lint script exists unless current files prove otherwise.
- Sequence work from contracts/data boundaries outward and identify rollback or compatibility needs.

## Output

Use exactly these sections:

【目标】

【当前实现】

【预计修改范围】

【数据流】

【数据库影响】

【权限影响】

【测试计划】

【风险】

【实施顺序】

Do not edit code, schema, migrations, or docs unless the user explicitly continues into implementation.
