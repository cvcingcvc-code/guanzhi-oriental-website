---
name: database-verifier
description: Verify that a database-backed workflow really creates, reads, updates, and when necessary deletes data through its request, validation, API, repository, ORM, and database path. Use for form submissions, CMS save/draft/publish, login/user data, media, settings, content APIs, CRUD, migrations, or database persistence debugging. Do not use for broad implementation audits without a persistence question, schema design planning, security-only reviews, commit preparation, or production-data operations.
---

# Database Verifier

## Identify the real data path

1. Read applicable `AGENTS.md`; otherwise read `README.md`, `CONTRIBUTING.md`, both package manifests, `compose.yaml`, `backend/drizzle.config.ts`, `backend/src/db/client.ts`, and the relevant schema, route, service/repository, tests, and migration files.
2. Detect the database and ORM from configuration rather than assuming them. This repository currently indicates PostgreSQL and Drizzle ORM; report if current files differ.
3. Trace `request -> Zod validation -> Fastify API -> service/repository -> Drizzle query -> PostgreSQL -> response -> subsequent read`.
4. Distinguish public published content from CMS revisions/drafts. Verify the correct table and read path for the requested behavior.

## Verify safely

- Begin with read-only inspection and existing integration tests.
- Confirm the target is a disposable local/test database before any write. Never print secrets or copy `.env` contents into output.
- Prefer a transaction that rolls back. If end-to-end HTTP verification requires committed visibility, use uniquely marked disposable data, record prior state, delete only the created record, and verify cleanup. Do not alter existing CMS content unless the user authorizes a reversible test and restoration is proven.
- Verify CREATE, READ, and UPDATE. Verify DELETE only when relevant and safe.
- Verify applicable foreign keys, unique constraints, validation, optimistic revision conflicts (`409`), missing references, transaction boundaries, row locks, rollback, and error mapping.
- For schema/migration work, compare `backend/src/db/schema.ts`, `backend/drizzle/`, and the actual database migration state. Do not generate or apply a migration merely to verify unless explicitly authorized.
- If the local database is unavailable or its safety cannot be established, stop before writes and report which checks remain static-only.

## Evidence standard

Use record identifiers, counts, status codes, and before/after values while redacting credentials, tokens, personal data, and sensitive content. A mocked repository or successful API response alone is not proof of persistence.

## Output

Use exactly these sections:

【数据库连接】

【执行路径】

【真实写入验证】

【读取验证】

【约束验证】

【异常验证】

【结果】
