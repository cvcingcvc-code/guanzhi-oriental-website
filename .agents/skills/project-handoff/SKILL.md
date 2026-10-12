---
name: project-handoff
description: Generate a current, source-grounded project handoff for a new Codex task, ChatGPT review, another agent, or an overlong context, including architecture, completed work, Git state, risks, next tasks, and a copy-ready prompt. Use when the user asks for a handoff, new window/task context, context transfer, or AI takeover. Do not use for commit readiness, implementation audits, speculative planning, or automatically writing a persistent docs handoff unless explicitly requested.
---

# Project Handoff

## Rebuild state from the repository

1. Read applicable `AGENTS.md`. If absent, read `README.md`, `CONTRIBUTING.md`, package manifests, and relevant architecture docs.
2. Inspect current entry points and affected implementation: public React, `src/admin/`, Fastify route registration, repositories/services, Drizzle schema/migrations, tests, and configuration examples.
3. Run read-only Git commands for branch, remotes, `git log -1 --format=fuller`, `git status --short --untracked-files=all`, staged/unstaged diff summaries, and upstream divergence when available.
4. Read recent handoff documents only as leads. Resolve conflicts in favor of current source, tests, and Git facts, and label anything not independently verified.
5. Inspect the latest available test evidence. Run gates only if the user asks for a verified handoff or existing evidence is insufficient and commands are safe; distinguish current-run results from historical docs.

## Preserve operational boundaries

- Record concrete file paths, API routes, database/ORM/migration facts, auth roles, CMS draft/publish semantics, known issues, and explicit non-goals.
- Never include passwords, tokens, secret values, private database content, or personal inquiry data.
- Do not guess what was completed. Distinguish committed, working-tree, staged, untracked, planned, and unknown work.
- Do not modify docs, code, schema, Git state, or external systems unless explicitly requested.

## Output

Use exactly these sections:

【项目目标】

【当前技术栈】

【项目结构】

【已经完成】

【关键架构决策】

【数据库】

【API】

【认证与权限】

【CMS / 内容系统】

【测试状态】

【最新 Git Commit】

【当前 Git Status】

【已知问题】

【遗留风险】

【下一阶段任务】

【禁止修改事项】

【推荐下一位 Agent 首先阅读的文件】

【可直接复制给新的 Codex / ChatGPT 的交接 Prompt】

Make the final prompt self-contained: include the repository path, required first reads, current goal/state, verification steps, constraints, and the first concrete action.
