/* =============================================================
   观止东方 · Cloudflare Pages Function
   表单提交处理 — POST /api/contact
   ============================================================= */

export async function onRequest(context) {
  const { request, env } = context;

  // 仅接受 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, errors: ['Method not allowed'] }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.formData();
  } catch {
    return new Response(JSON.stringify({ ok: false, errors: ['无法解析表单数据'] }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const name = (body.get('name') || '').trim();
  const org = (body.get('org') || '').trim();
  const email = (body.get('email') || '').trim();
  const interest = body.get('interest') || '';
  const message = (body.get('message') || '').trim();

  // 服务端校验
  const errors = [];
  if (!name || name.length < 2) errors.push('姓名 / Name 为必填项 (至少2字符)');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('请填写有效的邮箱地址');
  if (errors.length > 0) {
    return new Response(JSON.stringify({ ok: false, errors }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contactEmail = env.CONTACT_EMAIL || 'contact@guanzhi-dongfang.com';
  const resendKey = env.RESEND_API_KEY;

  // 尝试通过 Resend 发送邮件
  let emailSent = false;
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
          subject: ` [官网咨询] ${name} — ${org || '个人'} — ${interest || '未选意向'}`,
          html: `<h2>新的合作咨询</h2>
<table style="border-collapse:collapse">
<tr><td style="padding:6px 12px;color:#666">姓名</td><td style="padding:6px 12px">${name}</td></tr>
<tr><td style="padding:6px 12px;color:#666">机构</td><td style="padding:6px 12px">${org || '—'}</td></tr>
<tr><td style="padding:6px 12px;color:#666">邮箱</td><td style="padding:6px 12px">${email}</td></tr>
<tr><td style="padding:6px 12px;color:#666">意向</td><td style="padding:6px 12px">${interest || '—'}</td></tr>
<tr><td style="padding:6px 12px;color:#666">留言</td><td style="padding:6px 12px">${message || '—'}</td></tr>
</table>
<p style="color:#999;font-size:12px">提交时间: ${new Date().toISOString()}</p>`,
        }),
      });
      emailSent = resp.ok;
    } catch (_) { /* 静默失败 */ }
  }

  return new Response(JSON.stringify({
    ok: true,
    message: '感谢留言！我们会在 2–3 个工作日内回复。Thank you! We will reply within 2–3 business days.',
    emailSent,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
