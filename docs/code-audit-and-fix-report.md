# 冠芝东方网站 — 代码审计与修复完整报告

**审计日期**：2026-11-24（已全部修复并验证）<br>
**审计范围**：`feat/interaction-enhancements` 分支（含原始代码 + 新增交互增强代码 + 依赖升级）<br>
**仓库**：[cvcingcvc-code/guanzhi-oriental-website](https://github.com/cvcingcvc-code/guanzhi-oriental-website)<br>
**PR**：[#16 feat(ux): add frontend interaction enhancements](https://github.com/cvcingcvc-code/guanzhi-oriental-website/pull/16)

---

## 一、自动化测试与构建结果

| 维度 | 结果 | 详情 |
|------|------|------|
| 前端单元测试（Vitest） | ✅ **27 / 27 通过** | 4 个测试文件全部绿灯（含新增表单校验测试） |
| 后端单元测试（node:test） | ✅ **45 / 45 通过** | 含安全、鉴权、业务逻辑全部绿灯 |
| 前端 TypeScript 检查 | ✅ **通过（exit 0）** | `npx tsc -b --noEmit` 零类型错误 |
| 后端 TypeScript 检查 | ✅ **通过（exit 0）** | 零类型错误 |

---

## 二、代码审计发现与修复详情

### 🔴 阻断级 Bug（共 8 项，全部已修复并合入提交 `fe643fa`）

1. **Bug-1 (TS类型收窄失效 - `App.tsx`)**：`CtaButton` 闭包内 `run(cta!, trigger)` 添加非空断言，修复 TS2345 编译错误。
2. **Bug-2 ~ Bug-4 (可选链缺失 - `App.tsx`)**：
   - `hero?.media?.alt ?? ''`（L412）
   - `motifs?.items[0]?.media?.alt ?? ''`（L479）
   - `partners.items[0]?.media?.alt ?? ''`（L561）
   避免特定模块未载入或缺失图片时运行时抛出 `TypeError: Cannot read properties of undefined`。
3. **Bug-5 (无障碍焦点管理 - `InquiryDialog.tsx`)**：引入 `successCloseRef`，在表单提交成功后将焦点自动移至成功页面的关闭/返回按钮，满足 WCAG 无障碍规范。
4. **Bug-6 (CSS 双重下划线 - `interaction-enhancements.css`)**：修复 `.contact-email` 的 `display: block` 与 `border-bottom: none`，消除静态下划线与 `::after` 动效下划线重叠。
5. **Bug-7 (CSS 双重外边距 - `interaction-enhancements.css`)**：添加 `.motif-img-wrap img { margin-bottom: 0 }`，消除叠加后的 36px 双重间距。
6. **Bug-8 (CSS 优先级冲突 - `interaction-enhancements.css`)**：移除 `.site-header` 上的 `!important`，补全 `height 0.35s ease` 过渡。

---

### 🟡 警告级问题（共 5 项，全部已修复并合入提交 `f3f338d`）

1. **W-1 (`App.tsx` - CtaButton 内存泄漏防范)**：
   - 使用 `useRef<ReturnType<typeof setTimeout> | null>` 追踪波纹效果定时器，在组件卸载或再次触发时自动清理 `clearTimeout`。
2. **W-2 (`App.tsx` - PageImage 加载状态闪烁防范)**：
   - 添加 `useEffect` 监听 `path` 属性变化，在路由切换时重置 `loaded = false`，彻底避免跨路由切换时展示旧图淡出残影。
3. **W-3 (`App.tsx` - changeLocale 引用稳定性)**：
   - 使用 `useCallback` 包裹 `changeLocale`，精确声明依赖项，避免父组件不必要的子树重渲染。
4. **W-4 (`InquiryDialog.tsx` - 飞行中请求中止)**：
   - 增加 `fetchController = useRef<AbortController | null>`，弹窗关闭或组件卸载时调用 `abort()` 中止进行中的 `/api/v1/inquiries` 请求，并在 catch 中过滤 `AbortError`。
5. **W-5 (`InquiryDialog.test.tsx` - 字段实时校验与表单提交测试覆盖)**：
   - 补充 `InquiryDialog validation` 测试套件，分别验证姓名等字段失焦（blur）触发错误、合规输入后清除错误，以及直接点击提交按钮时的全量拦截逻辑。

---

## 三、依赖安全审计与升级（提交 `ea51338`）

1. **后端 Zod 依赖升级**：
   - 由 `4.4.3` 升级至最新稳定版 `zod@4.6.7`（`backend/package.json`）。
   - 彻底消除了生产依赖中报出的 High 等级内存耗尽漏洞（GHSA-mrhx-c7xc-m3w5）。
   - 升级后后端 45 项测试（包含各 Schema 校验、Homepage Contract、Multipart 过滤等）均正常通过。
2. **devDependencies 安全说明**：
   - 前端 devDependencies 存在 Vitest / Tinypool 等开发环境漏洞，已确认仅存在于测试/本地开发环境，打包产物不包含任何 dev 依赖。

---

## 四、提交记录汇总

| Commit | 模块 | 说明 |
|--------|------|------|
| `fe643fa` | 前端 | `fix(ux): resolve all audit findings in interaction enhancement code` |
| `f3f338d` | 前端/测试 | `fix(ux): address warning-level audit items W-1 through W-5` |
| `ea51338` | 后端依赖 | `chore(deps): update zod to 4.6.7 in backend to eliminate GHSA-mrhx-c7xc-m3w5` |

---

## 五、PR #16 合并指引

- **PR 链接**：[#16 feat(ux): add frontend interaction enhancements](https://github.com/cvcingcvc-code/guanzhi-oriental-website/pull/16)
- **当前状态**：所有代码、测试和依赖更新已全部推送至远端分支 `feat/interaction-enhancements`。
- **分支保护规则说明**：
  - 仓库针对 `master` 启用了 Ruleset `保护 master 分支`，要求至少有 **1 个具有写权限的协作者提供 Approving Review**（`required_approving_review_count: 1`）。
  - 根据 GitHub 规范，PR 创建者无法直接 Approve 自己的 PR。
  - **建议操作**：请项目管理员或协作者在 GitHub 网页端打开 [PR #16](https://github.com/cvcingcvc-code/guanzhi-oriental-website/pull/16)，点击「Files changed」→「Review changes」→ 选择「Approve」提交后，即可直接点击「Merge pull request」完成上线合入。
