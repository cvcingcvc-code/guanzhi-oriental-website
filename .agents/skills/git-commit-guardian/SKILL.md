---
name: git-commit-guardian
description: Perform the final Git readiness check before a commit, push, delivery, or end-of-stage handoff by reviewing status, diffs, sensitive or generated files, scope, and required gates, then suggest a Conventional Commit message. Use when the user says prepare to commit, submit, push, or asks whether changes are commit-ready. Do not use for implementation auditing, ordinary development completion without Git intent, creating commits automatically, or project handoff summaries.
---

# Git Commit Guardian

## Inspect without mutating

1. Read applicable `AGENTS.md`; otherwise read `CONTRIBUTING.md` and relevant package scripts.
2. Run `git status --short --untracked-files=all`, `git diff`, `git diff --staged`, and `git diff --check`. Inspect both staged and unstaged files and compare the current branch with the intended scope.
3. Do not stage, unstage, discard, commit, push, or rewrite history unless the user separately and explicitly authorizes that action.

## Check the candidate set

- Flag `.env` files other than reviewed examples, credentials, secrets, tokens, passwords, private keys, database URLs, personal data, and dumps.
- Flag `node_modules`, `dist`, `build`, coverage, logs, temp/cache files, IDE/OS files, local uploads, database volumes/backups, and unrelated generated artifacts.
- Inspect suspicious content without printing secret values. Report path and category only.
- Confirm docs/tests/migrations accompany contract, API, or schema changes as required by `CONTRIBUTING.md`.
- Confirm commit scope is cohesive; recommend splitting unrelated work rather than silently excluding user changes.

## Run current gates

- Root: `npm run build`; run `node --test tests/*.test.js` when root tests cover the change.
- Backend: `npm run typecheck`, `npm test`, and `npm run build` from `backend/` when backend or shared behavior is in scope.
- Lint: run only when current repository scripts/config define it; otherwise report `未配置`.
- Re-read status after gates because builds may create artifacts.

Suggest a Conventional Commit message based only on the candidate diff. A passing gate does not make an unsafe or incoherent file set ready.

## Output

Use exactly these sections:

【Git 状态】

【准备提交文件】

【不应提交文件】

【测试状态】

【建议 Commit Message】

【是否适合提交】
