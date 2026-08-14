# 协作开发指南

## 分支与提交

- 从最新 `master` 创建 `codex/<topic>` 或 `feature/<topic>` 分支。
- 一个分支只处理一个明确主题。
- 使用 Conventional Commits，例如 `feat: ...`、`fix: ...`、`docs: ...`。
- 通过 Pull Request 合并；多人开发时不要强制推送 `master`。
- 禁止提交 `.env`、token、密码、`node_modules`、`dist`、上传文件和数据库导出。

## 开发启动

```powershell
git clone https://github.com/cvcingcvc-code/guanzhi-oriental-website.git
cd guanzhi-oriental-website
nvm use
npm ci
cd backend
npm ci
Copy-Item .env.example .env
```

按 [新窗口交接文档](./docs/NEW-WINDOW-HANDOFF.md) 启动 PostgreSQL、Seed、后端和前端。

## 提交前门禁

```powershell
npm run build
cd backend
npm run typecheck
npm test
npm run build
cd ..
git diff --check
git status --short
```

涉及 Contract、API 或数据库的 Pull Request 必须同步测试和文档。Schema 变化必须包含 migration。

## 前后端边界

- Public 页面只通过 HTTP API / Public DTO 获取数据；前端不得导入 `backend/src` 或直接访问 PostgreSQL。
- React 组件、CSS、布局、响应式和展示交互可以独立替换，但不得暗中改变 DTO、认证、权限、后端校验或 CMS draft/publish 语义。
- API Contract 或数据库 Schema 需要变更时，创建独立 PR，说明兼容性影响，并请求 Backend Review。

## 标准协作流

`master` → 主题分支 → 有边界的 commit → push → Draft PR → CI → Review → Ready for Review → Merge。禁止直接向 `master` 推送业务开发代码；不得 force push 已进入协作 Review 的分支。

## PR 要求

- 描述目标与非范围。
- 说明 API / Contract / Schema 是否变化。
- 提供中英文、桌面和移动端验证结果。
- 列出测试命令与结果。
- 前端接口变更按 [前端替换声明](./docs/frontend-replacement-guide.md) 检查全链路。
