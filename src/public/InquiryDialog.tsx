import { FormEvent, useEffect, useRef, useState } from 'react';
import type { ContentLocale } from '../content/public-content';
import { UI_TEXT } from '../i18n/ui';

const intentValues = ['custom-rd', 'co-production', 'licensing', 'white-label', 'per-group', 'training'] as const;

const dialogCopy = {
  'zh-CN': {
    kicker: 'COOPERATION · 合作咨询', title: '让我们从内容开始。', description: '留下基本项目背景，我们会尽快与您联系。',
    name: '您的称呼', organization: '机构名称', email: '联系邮箱', phone: '微信 / 电话（选填）', intent: '合作方式', brief: '项目背景与需求',
    placeholders: ['姓名', '公司 / 机构', 'name@example.com', '微信号或联系电话', '目的地、目标客群、合作目标和大致时间'],
    modes: ['委托研发', '联合出品', '内容授权', '白标产品', '按团或按人结算', '培训与交付支持'],
    submit: '提交合作意向', submitting: '正在提交…', success: '已收到您的合作咨询。', successBody: '感谢关注，我们会尽快与您联系。', again: '返回网站',
  },
  en: {
    kicker: 'COOPERATION · PARTNERSHIP INQUIRY', title: 'Let us begin with content.', description: 'Share a short project brief and we will get back to you.',
    name: 'Your name', organization: 'Organisation', email: 'Email', phone: 'WeChat / phone (optional)', intent: 'Partnership model', brief: 'Project brief',
    placeholders: ['Name', 'Company / organisation', 'name@example.com', 'WeChat ID or phone', 'Destination, audience, objective and approximate timing'],
    modes: ['Commissioned R&D', 'Co-production', 'Content licensing', 'White label', 'Per group / per guest', 'Training & delivery'],
    submit: 'Send inquiry', submitting: 'Sending…', success: 'Your inquiry has been received.', successBody: 'Thank you. We will be in touch shortly.', again: 'Return to website',
  },
} as const;

type Props = { locale: ContentLocale; email: string; open: boolean; onClose: () => void; returnFocus: HTMLElement | null };

export function InquiryDialog({ locale, email, open, onClose, returnFocus }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const text = dialogCopy[locale];
  const ui = UI_TEXT[locale];

  useEffect(() => {
    if (!open) return;
    setSubmitted(false); setError('');
    document.body.classList.add('overlay-open');
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')];
      if (!focusable.length) return;
      const first = focusable[0]!; const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { window.clearTimeout(focusTimer); document.removeEventListener('keydown', handleKey); document.body.classList.remove('overlay-open'); returnFocus?.focus(); };
  }, [open, onClose, returnFocus]);

  useEffect(() => {
    if (open && submitted) requestAnimationFrame(() => closeRef.current?.focus());
  }, [open, submitted]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget; const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? '').trim(), organization: String(data.get('organization') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(), contact: String(data.get('phone') ?? '').trim() || undefined,
      intent: String(data.get('intent') ?? 'custom-rd'), message: String(data.get('brief') ?? '').trim(), locale,
      sourceUrl: window.location.href, website: '',
    };
    if (payload.name.length < 2 || payload.name.length > 80 || payload.organization.length < 2 || payload.organization.length > 160) { setError(locale === 'en' ? 'Please complete your name and organisation within the indicated limits.' : '请按要求填写姓名和机构名称。'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 254) { setError(ui.inquiry.emailError); return; }
    if (payload.contact && (payload.contact.length < 6 || payload.contact.length > 100)) { setError(locale === 'en' ? 'Please enter at least 6 characters for WeChat or phone.' : '微信号或联系电话请至少填写 6 个字符。'); return; }
    if (payload.message.length < 6 || payload.message.length > 2000) { setError(ui.inquiry.briefError); return; }
    submittingRef.current = true; setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/v1/inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null) as { ok?: boolean } | null;
      if (!response.ok || !result?.ok) {
        if (response.status === 429) throw new Error(ui.inquiry.rateError);
        if (response.status >= 500) throw new Error(ui.inquiry.serverError);
        throw new Error(ui.inquiry.validationError);
      }
      form.reset(); setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error && !/fetch|network/i.test(reason.message) ? reason.message : ui.inquiry.networkError(email));
    } finally { submittingRef.current = false; setSubmitting(false); }
  }

  return <div className={`contact-sheet${open ? ' is-open' : ''}`} aria-hidden={!open}>
    <button className="sheet-backdrop" aria-label={ui.inquiry.close} onClick={onClose} tabIndex={-1} />
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="contact-title">
      <button ref={closeRef} className="sheet-close" aria-label={ui.inquiry.close} onClick={onClose}>×</button>
      {submitted ? <div className="form-success"><p className="eyebrow">SUCCESS</p><h2 id="contact-title">{text.success}</h2><p>{text.successBody}</p><button className="primary-action" onClick={onClose}>{text.again}<span>→</span></button></div>
        : <form onSubmit={submit} noValidate><p className="eyebrow">{text.kicker}</p><h2 id="contact-title">{text.title}</h2><p className="form-description">{text.description}</p><div className="form-grid">
          <label>{text.name}<input name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder={text.placeholders[0]} /></label>
          <label>{text.organization}<input name="organization" autoComplete="organization" required minLength={2} maxLength={160} placeholder={text.placeholders[1]} /></label>
          <label className="full">{text.email}<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder={text.placeholders[2]} /></label>
          <label className="full">{text.phone}<input name="phone" autoComplete="tel" minLength={6} maxLength={100} placeholder={text.placeholders[3]} /></label>
          <label className="full">{text.intent}<select name="intent" defaultValue="custom-rd">{intentValues.map((value, index) => <option key={value} value={value}>{text.modes[index]}</option>)}</select></label>
          <label className="full">{text.brief}<textarea name="brief" rows={4} required minLength={6} maxLength={2000} placeholder={text.placeholders[4]} /></label>
        </div>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary-action form-submit" type="submit" disabled={submitting}>{submitting ? text.submitting : text.submit}<span>→</span></button></form>}
    </section>
  </div>;
}
