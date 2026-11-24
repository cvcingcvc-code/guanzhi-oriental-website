# 观止东方官网 — 前端交互优化方案

> 基于对原始代码（`App.tsx` / `InquiryDialog.tsx` / `client-overrides.css`）的完整阅读，以下改进完全兼容现有技术栈（React 18 + TypeScript + CSS），**不引入任何新依赖**。

---

## 改动文件速览

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/App.tsx` | 替换 | 新增 PageTransition、滚动感知 header、CTA 波纹、图片淡入、菜单动画 |
| `src/public/InquiryDialog.tsx` | 替换 | 新增逐字段实时验证、字数计数、提交状态箭头动画 |
| `src/interaction-enhancements.css` | 新增 | 所有新增 CSS（在 `client-overrides.css` 之后引入即可） |

---

## 具体改动说明

### 1. 页面切换过渡动画 — `PageTransition` 组件

**改前**：路由切换瞬间替换，内容突然出现。  
**改后**：每次路由变化时，新页面以 `opacity 0→1` + `translateY(12px→0)` 淡入上滑，时长 550ms。

```tsx
// App.tsx — 每个 Route 包裹 PageTransition
<PageTransition pageKey="about">
  <section id="main-content" ...>...</section>
</PageTransition>
```

> [!NOTE]
> `pageKey` 变化时 React 重新挂载组件，`useEffect` 在下一帧触发 `visible=true`，确保浏览器有机会计算初始样式再开始过渡。

---

### 2. 导航栏滚动感知 — `scrolled` 状态 + 毛玻璃

**改前**：Header 始终半透明渐变，页面滚动后导航与背景混在一起。  
**改后**：滚动超过 20px 后 header 自动加深背景色并启用 `backdrop-filter: blur(14px)`。

```tsx
// 监听滚动（passive 选项，零性能开销）
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

```css
/* 通过 React 内联 style 控制，CSS 只提供过渡声明 */
.site-header {
  transition: background 0.5s ease, backdrop-filter 0.5s ease;
}
```

---

### 3. CTA 按钮点击波纹 — `.cta-ripple`

**改前**：点击 CTA 只有 hover 状态变化，没有点击反馈。  
**改后**：点击位置扩散出半透明白色圆形波纹，600ms 消散。

```tsx
// CtaButton 组件记录点击坐标，渲染 .cta-ripple span
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  setRipple({ x: event.clientX - rect.left, y: event.clientY - rect.top, id: Date.now() });
  setTimeout(() => setRipple(null), 600);
  run(cta, event.currentTarget);
}
```

同时修复了箭头图标 hover 时偏移动效（↗ 方向右上移动 3px）。

---

### 4. 页面图片加载淡入 — `PageImage` 组件

**改前**：图片加载时白块闪烁，加载完成后突然出现。  
**改后**：图片 `onLoad` 触发后以 900ms 淡入，加载期间背景色 `#081113` 保持。

```tsx
function PageImage({ path, alt, eager = false }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="page-visual">
      <img
        ...
        onLoad={() => setLoaded(true)}
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.9s cubic-bezier(0.22, 0.8, 0.2, 1)',
        }}
      />
    </div>
  );
}
```

---

### 5. Home overview 卡片微交互增强

**改前**：hover 只有 `background: #ffffff0d`，几乎感知不到。  
**改后**：
- hover 时左 padding 从 16px → 20px（`transition: padding-left 0.28s`），形成滑入感
- 箭头 `→` 向右位移 5px，opacity 0.55 → 1
- 整体悬停背景加深至 `rgba(255,255,255,0.07)`

---

### 6. 汉堡菜单两段式 × 形动画

**改前**：两段横线直接消失/出现，没有动画。  
**改后**：
- 打开时：第一段旋转 +45°，第二段旋转 -45°，合并成 ×
- 关闭时：反向还原

```css
.menu-toggle.is-open i:first-child { transform: translateY(3.5px) rotate(45deg); }
.menu-toggle.is-open i:last-child  { transform: translateY(-3.5px) rotate(-45deg); }
```

原代码已有 `<i /><i />` 结构，只需 `.is-open` 类动态切换即可，无需改 HTML。

---

### 7. 语言切换 loading 状态

**改前**：切换语言时按钮 `disabled`，无任何视觉反馈（用户以为没响应）。  
**改后**：正在切换的那个语言按钮添加 `.lang-loading` 类，触发 0.9s 透明度脉冲动画。

```css
.language-switch button.lang-loading {
  animation: lang-pulse 0.9s ease-in-out infinite alternate;
}
```

---

### 8. 询盘表单 — 逐字段实时验证

**改前**：所有校验在提交时一次性触发，全部错误同时出现。  
**改后**：
- `onBlur` 触发单字段校验，错误以内联小字 + 朱砂色标注
- `onChange` 时清除该字段错误（即时反馈「已修正」）
- 提交时仍做全字段校验（防绕过）
- 字段错误用 `animation: field-error-in` 淡入上滑出现

```tsx
function validateField(name: keyof FieldErrors, value: string): string {
  switch (name) {
    case 'name': return value.trim().length >= 2 && value.trim().length <= 80 ? '' : text.fieldErrors.name;
    // ...
  }
}
function handleBlur(event: React.FocusEvent<...>) {
  const error = validateField(event.target.name, event.target.value);
  setFieldErrors((prev) => ({ ...prev, [event.target.name]: error }));
}
```

---

### 9. 表单 brief 字段字数计数

**改前**：`maxLength={2000}` 存在但用户不知道还剩多少字。  
**改后**：brief 标签行右侧实时显示 `n / 2000`，剩余不足 100 字时变为朱砂色警示。

```tsx
<span className={`char-count${briefLen > 1900 ? ' near-limit' : ''}`}>
  {text.charCount(briefLen, 2000)}
</span>
```

---

### 10. motif 卡片图片缩放悬停

**改前**：motif 图片静止，无悬停反馈。  
**改后**：hover 时图片 `scale(1.04)`，600ms 过渡，`.motif-img-wrap` 设 `overflow: hidden` 裁剪溢出。

---

### 11. 联系邮件链接下划线动效

**改前**：`border-bottom` 静态下划线。  
**改后**：hover 时下划线从右向左收缩消失（`scaleX: 1 → 0`），形成「扫过」效果。

---

## 引入方式（3 步）

```bash
# 1. 覆盖 App.tsx
cp improved/src/App.tsx src/App.tsx

# 2. 覆盖 InquiryDialog.tsx
cp improved/src/public/InquiryDialog.tsx src/public/InquiryDialog.tsx

# 3. 在 client-overrides.css 末尾追加（或在 main.tsx 单独 import）
#    推荐方案：在 src/main.tsx 的 import 顺序末尾加一行
import './interaction-enhancements.css';
```

> [!IMPORTANT]
> `interaction-enhancements.css` 必须在 `client-overrides.css` 之后加载（确保特异性覆盖正确）。

---

## 无障碍合规说明

所有新增交互均包含 `prefers-reduced-motion: reduce` 降级：

```css
@media (prefers-reduced-motion: reduce) {
  .cta-ripple, .lang-loading, .cta-arrow,
  .overview-arrow, .motif-img-wrap img,
  .contact-email::after, .menu-toggle i {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
```

---

## 效果对比总结

| 场景 | 改前 | 改后 |
|------|------|------|
| 路由切换 | 瞬间替换 | 淡入上滑 550ms |
| 页面滚动 | 导航栏始终半透明 | 滚动后毛玻璃加深 |
| CTA 点击 | 颜色变化 | 点击位置扩散波纹 + 箭头偏移 |
| 图片加载 | 白块/突然出现 | 渐入 900ms |
| 首页概览卡 | 淡背景 | 左移 + 箭头动效 |
| 汉堡菜单 | 无动画 | 两段旋转成 × |
| 语言切换 | 按钮灰掉 | 脉冲动画反馈 |
| 表单校验 | 提交后统一报错 | 失焦即时反馈 |
| brief 字数 | 不可见 | 实时计数，接近上限变红 |
