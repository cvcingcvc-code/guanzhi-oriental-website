import { FormEvent, useEffect, useRef, useState } from 'react';
import type { ContentLocale } from '../content/public-content';
import { UI_TEXT } from '../i18n/ui';

const intentValues = ['custom-rd', 'co-production', 'licensing', 'white-label', 'per-group', 'training'] as const;

const dialogCopy = {
  'zh-CN': {
    kicker: 'COOPERATION · 合作咨询',
    title: '让我们从内容开始。',
    description: '留下基本项目背景，我们会尽快与您联系。',
    name: '您的称呼', organization: '机构名称', email: '联系邮箱',
    phone: '微信 / 电话（选填）', intent: '合作方式', brief: '项目背景与需求',
    placeholders: ['姓名', '公司 / 机构', 'name@example.com', '微信号或联系电话', '目的地、目标客群、合作目标和大致时间'],
    modes: ['委托研发', '联合出品', '内容授权', '白标产品', '按团或按人结算', '培训与交付支持'],
    submit: '提交合作意向', submitting: '正在提交…',
    success: '已收到您的合作咨询。', successBody: '感谢关注，我们会尽快与您联系。', again: '返回网站',
    fieldErrors: {
      name: '姓名至少 2 个字符，不超过 80 个。',
      organization: '机构名称至少 2 个字符，不超过 160 个。',
      email: '请输入有效的邮箱地址。',
      phone: '微信或联系电话至少 6 个字符。',
      brief: '请至少用 6 个字符说明合作需求。',
    },
    charCount: (n: number, max: number) => `${n} / ${max}`,
  },
  en: {
    kicker: 'COOPERATION · PARTNERSHIP INQUIRY',
    title: 'Let us begin with content.',
    description: 'Share a short project brief and we will get back to you.',
    name: 'Your name', organization: 'Organisation', email: 'Email',
    phone: 'WeChat / phone (optional)', intent: 'Partnership model', brief: 'Project brief',
    placeholders: ['Name', 'Company / organisation', 'name@example.com', 'WeChat ID or phone', 'Destination, audience, objective and approximate timing'],
    modes: ['Commissioned R&D', 'Co-production', 'Content licensing', 'White label', 'Per group / per guest', 'Training & delivery'],
    submit: 'Send inquiry', submitting: 'Sending…',
    success: 'Your inquiry has been received.', successBody: 'Thank you. We will be in touch shortly.', again: 'Return to website',
    fieldErrors: {
      name: 'Name must be between 2 and 80 characters.',
      organization: 'Organisation must be between 2 and 160 characters.',
      email: 'Please enter a valid email address.',
      phone: 'WeChat / phone must be at least 6 characters.',
      brief: 'Please describe your needs in at least 6 characters.',
    },
    charCount: (n: number, max: number) => `${n} / ${max}`,
  },
} as const;

type FieldErrors = Partial<Record<'name' | 'organization' | 'email' | 'phone' | 'brief', string>>;

type Props = {
  locale: ContentLocale;
  email: string;
  open: boolean;
  onClose: () => void;
  returnFocus: HTMLElement | null;
};

export function InquiryDialog({ locale, email, open, onClose, returnFocus }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const successCloseRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState('');
  // 实时字段校验错误（blur 后触发）
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // 字数计数（brief 字段）
  const [briefLen, setBriefLen] = useState(0);

  const text = dialogCopy[locale];
  const ui = UI_TEXT[locale];

  // ── 弹窗生命周期管理（焦点/键盘/body 滚动） ──────────────────────────────
  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setGlobalError('');
    setFieldErrors({});
    setBriefLen(0);
    document.body.classList.add('overlay-open');
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      document.body.classList.remove('overlay-open');
      returnFocus?.focus();
    };
  }, [open, onClose, returnFocus]);

  useEffect(() => {
    if (open && submitted) requestAnimationFrame(() => successCloseRef.current?.focus());
  }, [open, submitted]);

  // ── 单字段实时验证（blur 时触发） ────────────────────────────────────────
  function validateField(name: keyof FieldErrors, value: string): string {
    switch (name) {
      case 'name':
        return value.trim().length >= 2 && value.trim().length <= 80 ? '' : text.fieldErrors.name;
      case 'organization':
        return value.trim().length >= 2 && value.trim().length <= 160 ? '' : text.fieldErrors.organization;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 254 ? '' : text.fieldErrors.email;
      case 'phone':
        return !value.trim() || (value.trim().length >= 6 && value.trim().length <= 100) ? '' : text.fieldErrors.phone;
      case 'brief':
        return value.trim().length >= 6 && value.trim().length <= 2000 ? '' : text.fieldErrors.brief;
      default:
        return '';
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const name = event.target.name as keyof FieldErrors;
    if (!name || !(name in text.fieldErrors)) return;
    const error = validateField(name, event.target.value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  }

  // ── 表单提交 ─────────────────────────────────────────────────────────────
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? '').trim(),
      organization: String(data.get('organization') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      contact: String(data.get('phone') ?? '').trim() || undefined,
      intent: String(data.get('intent') ?? 'custom-rd'),
      message: String(data.get('brief') ?? '').trim(),
      locale,
      sourceUrl: window.location.href,
      website: '',
    };

    // 提交前全字段校验
    const errors: FieldErrors = {
      name: validateField('name', payload.name),
      organization: validateField('organization', payload.organization),
      email: validateField('email', payload.email),
      phone: payload.contact ? validateField('phone', payload.contact) : '',
      brief: validateField('brief', payload.message),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    submittingRef.current = true;
    setSubmitting(true);
    setGlobalError('');
    try {
      const response = await fetch('/api/v1/inquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean } | null;
      if (!response.ok || !result?.ok) {
        if (response.status === 429) throw new Error(ui.inquiry.rateError);
        if (response.status >= 500) throw new Error(ui.inquiry.serverError);
        throw new Error(ui.inquiry.validationError);
      }
      form.reset();
      setBriefLen(0);
      setSubmitted(true);
    } catch (reason) {
      setGlobalError(
        reason instanceof Error && !/fetch|network/i.test(reason.message)
          ? reason.message
          : ui.inquiry.networkError(email),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className={`contact-sheet${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <button className="sheet-backdrop" aria-label={ui.inquiry.close} onClick={onClose} tabIndex={-1} />
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button ref={closeRef} className="sheet-close" aria-label={ui.inquiry.close} onClick={onClose}>
          ×
        </button>

        {submitted ? (
          /* ── 成功状态 ─────────────────────────────────────────────────── */
          <div className="form-success">
            <p className="eyebrow">SUCCESS</p>
            <h2 id="contact-title">{text.success}</h2>
            <p>{text.successBody}</p>
            <button ref={successCloseRef} className="primary-action" onClick={onClose}>
              {text.again}<span>→</span>
            </button>
          </div>
        ) : (
          /* ── 表单 ─────────────────────────────────────────────────────── */
          <form onSubmit={submit} noValidate>
            <p className="eyebrow">{text.kicker}</p>
            <h2 id="contact-title">{text.title}</h2>
            <p className="form-description">{text.description}</p>
            <div className="form-grid">
              {/* 姓名 */}
              <label className={fieldErrors.name ? 'has-error' : ''}>
                {text.name}
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder={text.placeholders[0]}
                  onBlur={handleBlur}
                  onChange={() => setFieldErrors((p) => ({ ...p, name: '' }))}
                />
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </label>

              {/* 机构 */}
              <label className={fieldErrors.organization ? 'has-error' : ''}>
                {text.organization}
                <input
                  name="organization"
                  autoComplete="organization"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder={text.placeholders[1]}
                  onBlur={handleBlur}
                  onChange={() => setFieldErrors((p) => ({ ...p, organization: '' }))}
                />
                {fieldErrors.organization && <span className="field-error">{fieldErrors.organization}</span>}
              </label>

              {/* 邮箱 */}
              <label className={`full${fieldErrors.email ? ' has-error' : ''}`}>
                {text.email}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder={text.placeholders[2]}
                  onBlur={handleBlur}
                  onChange={() => setFieldErrors((p) => ({ ...p, email: '' }))}
                />
                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </label>

              {/* 微信/电话（可选） */}
              <label className={`full${fieldErrors.phone ? ' has-error' : ''}`}>
                {text.phone}
                <input
                  name="phone"
                  autoComplete="tel"
                  minLength={6}
                  maxLength={100}
                  placeholder={text.placeholders[3]}
                  onBlur={handleBlur}
                  onChange={() => setFieldErrors((p) => ({ ...p, phone: '' }))}
                />
                {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
              </label>

              {/* 合作方式 */}
              <label className="full">
                {text.intent}
                <select name="intent" defaultValue="custom-rd">
                  {intentValues.map((value, index) => (
                    <option key={value} value={value}>{text.modes[index]}</option>
                  ))}
                </select>
              </label>

              {/* 项目背景（带字数计数） */}
              <label className={`full${fieldErrors.brief ? ' has-error' : ''}`}>
                <span className="brief-label-row">
                  {text.brief}
                  <span className={`char-count${briefLen > 1900 ? ' near-limit' : ''}`}>
                    {text.charCount(briefLen, 2000)}
                  </span>
                </span>
                <textarea
                  name="brief"
                  rows={4}
                  required
                  minLength={6}
                  maxLength={2000}
                  placeholder={text.placeholders[4]}
                  onBlur={handleBlur}
                  onChange={(e) => {
                    setBriefLen(e.target.value.length);
                    if (fieldErrors.brief) setFieldErrors((p) => ({ ...p, brief: '' }));
                  }}
                />
                {fieldErrors.brief && <span className="field-error">{fieldErrors.brief}</span>}
              </label>
            </div>

            {/* 全局错误 */}
            {globalError && (
              <div className="form-error" role="alert">{globalError}</div>
            )}

            {/* 提交按钮 */}
            <button className="primary-action form-submit" type="submit" disabled={submitting}>
              {submitting ? text.submitting : text.submit}
              <span className={`cta-arrow${submitting ? ' spin' : ''}`}>→</span>
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
