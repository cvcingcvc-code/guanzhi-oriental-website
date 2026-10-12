---
name: security-reviewer
description: Perform a focused Web security audit for authentication, authorization, admin/CMS, upload/media, APIs, cookies or sessions, JWT, CORS, data modification, and publishing flows. Use when the user asks for a security review or when security-sensitive behavior has changed. Do not use for general correctness audits, feature planning, database-only verification, commit hygiene, or broad refactoring; report findings and minimal remediations before changing code.
---

# Security Reviewer

## Scope from current evidence

1. Read applicable `AGENTS.md`; otherwise read `README.md`, `CONTRIBUTING.md`, relevant docs, package manifests, configuration examples, route registration, auth plugin, validators, repositories/services, media storage, and tests.
2. Inspect the relevant diff when reviewing recent work. Never reveal `.env` values, passwords, JWTs, database URLs, or personal inquiry data.
3. Map trust boundaries: browser/public API/admin API, JWT identity, `ADMIN`/`EDITOR`, storage and database, proxy/CORS, and external notification services.

## Review checklist

- Authentication: credential validation, password hashing, token lifetime/storage, inactive users, login rate limits, error leakage.
- Authorization: route pre-handlers, role checks, default-deny behavior, horizontal/vertical IDOR, generic admin endpoints that bypass dedicated Homepage rules.
- Input/output: Zod coverage, mass assignment, unsafe object fields, reflected/stored XSS, CSV injection, SQL injection or raw SQL, error and log leakage.
- State-changing requests: CSRF assumptions for bearer tokens, CORS allowlist behavior, replay/concurrency, optimistic revision locks, transaction and audit boundaries.
- Upload/media: size limits, magic-byte and MIME checks, extension handling, SVG policy, filename/storage-key generation, traversal, executable serving, soft deletion and live references.
- Deployment/config: Helmet/CSP, proxy trust, cookie/session flags if used, insecure defaults, secret length, `.env` tracking, Swagger exposure, public upload access, debug settings.
- Sensitive data: inquiry retention/export, logs, audit payloads, tokens in URLs/storage, source maps and responses.

Validate reachable behavior with existing tests and safe non-destructive requests where practical. Do not inflate severity, claim exploitability without a path, or perform destructive/production testing. Propose the smallest correction that closes the verified gap; do not implement it unless asked.

## Output

Use exactly these sections:

【安全结论】

【高风险】

【中风险】

【低风险】

【已验证安全措施】

【建议修改】

For every finding, include affected path, attack precondition, impact, evidence, and minimal remediation. Say `未发现` when a severity tier is empty.
