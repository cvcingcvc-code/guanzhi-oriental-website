# 观止东方 · Guanzhi Dongfang

**东方文化深度体验产品研发与供应机构**

把东方文化，转化为可以进入的旅行体验。

---

## 技术栈

纯静态 HTML + CSS + JS，零框架依赖。双击 `index.html` 即可预览。

- **字体**: Noto Serif SC (宋体) + Source Serif 4 (英文衬线)，自托管
- **后端**: Cloudflare Pages Functions (生产) / Express (本地开发)
- **部署**: Cloudflare Pages

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器 (含表单 API)
npm run dev
# → http://localhost:3000
```

仅预览设计：直接双击 `index.html` 即可。

## 项目结构

```
├── index.html          # 主页面
├── css/style.css       # 样式系统
├── js/main.js          # 交互逻辑
├── fonts/              # 自托管字体
├── images/             # 图片资源
├── functions/api/      # Cloudflare Pages Functions
├── server.js           # 本地开发服务器
└── assets/             # Favicon 等
```

## 环境变量

复制 `.env.example` → `.env`，填入实际 API Key。

## 部署

推送到 GitHub → Cloudflare Pages 自动部署。

---

© 2026 杭州观止东方文化传播有限公司
