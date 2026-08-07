/* =============================================================
   观止东方 · 本地开发服务器
   Guanzhi Dongfang · Local Dev Server
   ============================================================= */

const express = require('express');
const path = require('path');
const fs = require('fs');

// 尝试加载 .env (可选依赖)
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch (_) {}

const app = express();
const PORT = process.env.PORT || 3000;

// 解析表单数据
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// API 路由 — 必须在 static 之前
app.all('/api/contact', (req, res, next) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, errors: ['Method not allowed'] });
  }
  next();
});
app.post('/api/contact', async (req, res) => {
  const { name, org, email, interest, message } = req.body;

  // 服务端校验
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('姓名 / Name 为必填项 (至少2字符)');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('请填写有效的邮箱地址');
  if (errors.length > 0) {
    return res.status(422).json({ ok: false, errors });
  }

  const submission = {
    name: name.trim(),
    org: (org || '').trim(),
    email: email.trim(),
    interest: interest || '',
    message: (message || '').trim(),
    submittedAt: new Date().toISOString(),
    ip: req.ip,
  };

  console.log('\n📬 新表单提交 ——————————————');
  console.log(`  姓名:    ${submission.name}`);
  console.log(`  机构:    ${submission.org || '(未填)'}`);
  console.log(`  邮箱:    ${submission.email}`);
  console.log(`  意向:    ${submission.interest || '(未选)'}`);
  console.log(`  留言:    ${submission.message || '(无)'}`);
  console.log(`  时间:    ${submission.submittedAt}`);
  console.log('———————————————\n');

  // 如果有 Resend API Key，发送邮件
  const resendKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL || 'contact@guanzhi-dongfang.com';

  if (resendKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: '观止东方 <noreply@guanzhi-dongfang.com>',
          to: contactEmail,
          subject: `[官网咨询] ${submission.name} — ${submission.org || '个人'} — ${submission.interest || '未选意向'}`,
          html: `<h2>新的合作咨询</h2>
<table style="border-collapse:collapse">
<tr><td style="padding:6px 12px;color:#666">姓名</td><td style="padding:6px 12px">${submission.name}</td></tr>
<tr><td style="padding:6px 12px;color:#666">机构</td><td style="padding:6px 12px">${submission.org || '—'}</td></tr>
<tr><td style="padding:6px 12px;color:#666">邮箱</td><td style="padding:6px 12px">${submission.email}</td></tr>
<tr><td style="padding:6px 12px;color:#666">意向</td><td style="padding:6px 12px">${submission.interest || '—'}</td></tr>
<tr><td style="padding:6px 12px;color:#666">留言</td><td style="padding:6px 12px">${submission.message || '—'}</td></tr>
</table>
<p style="color:#999;font-size:12px">提交时间: ${submission.submittedAt}</p>`,
        }),
      });
      if (resp.ok) {
        console.log('  ✅ 邮件已发送');
      } else {
        const err = await resp.text();
        console.error('  ⚠️ 邮件发送失败:', err);
      }
    } catch (err) {
      console.error('  ⚠️ 邮件服务异常:', err.message);
    }
  } else {
    console.log('  💡 提示: 设置 RESEND_API_KEY 环境变量即可自动发送邮件');
  }

  res.json({ ok: true, message: '感谢留言！我们会在 2–3 个工作日内回复。' });
});

// 静态文件 (API 路由之后)
app.use(express.static(__dirname));

// 启动
app.listen(PORT, () => {
  console.log(`\n🏯 观止东方 · 本地开发服务器`);
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   表单: POST http://localhost:${PORT}/api/contact\n`);
});
