import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  FALLBACK_HOME_ZH,
  FALLBACK_SETTINGS,
  loadHomeContent,
  loadSiteSettingsOrFallback,
  switchHomeLocale,
  type ContentLocale,
  type HomeContent,
} from './content/public-content';
import { UI_TEXT } from './i18n/ui';
import './client-overrides.css';

const chapterBackgrounds = Array.from({ length: 8 }, (_, index) => `/images/client-design/chapter-${index + 1}.webp`);

const copy = {
  'zh-CN': {
    nav: ['我们是谁', '研发能力', '产品实验室', '入江南', '合作'],
    chapterNames: ['观止东方', '我们是谁', '研发能力', '产品实验室', '入江南', '概念样板', '合作方式', '开始合作'],
    heroSub: '让人进入、理解，并记住东方文化。',
    heroIntro: '面向旅行社、酒店、会员机构与目的地的文化深度体验产品研发与供应机构。',
    explore: '探索研发方向', inquiry: '合作咨询', scroll: 'SCROLL TO ENTER',
    aboutKicker: 'WHO WE ARE · 我们是谁',
    aboutTitle: '不是把文化放进行程，\n而是让旅行进入文化。',
    principles: ['为文化找到可进入的入口', '为机构建立可交付的产品', '为不同语境完成准确转译'],
    capabilityKicker: 'RESEARCH & DELIVERY · 研发能力',
    capabilityTitle: '从文化母题，\n走向可交付的体验产品。',
    capabilityFallback: ['文化研究与主题提炼', '叙事系统与体验流程', '场景、人物与资源配置', '国际化内容转译', '手册、SOP 与交付体系', '质量评估与持续迭代'],
    studioKicker: 'PRODUCT STUDIO · 产品实验室',
    studioTitle: '我们不陈列路线，\n我们研究文化如何被体验。',
    studioNote: '以下方向正在研究、验证与联合开发中。',
    jiangnanKicker: 'FLAGSHIP PROGRAM · 旗舰研发计划',
    conceptKicker: 'CONCEPT PROTOTYPE · 概念样板',
    conceptTitle: '寒山夜钟',
    conceptTag: '概念研发中 · 非在售产品',
    conceptDescription: '以钟声、夜色与水岸为感知线索，把诗意、历史与在地空间组织成 90 分钟至半日的文化体验原型。',
    conceptMeta: [['感知线索', '钟声 · 夜色 · 水岸'], ['产品尺度', '90 MIN — HALF DAY']],
    coopKicker: 'CO-CREATION · 合作方式',
    coopTitle: '把内容、资源与交付，\n组织成可以共同生长的产品。',
    coopModes: ['委托研发', '联合出品', '内容授权', '白标产品', '按团或按人结算', '培训与交付支持'],
    process: ['沟通', '策划', '试走', '交付', '迭代'],
    contactKicker: 'LET THE CONVERSATION BEGIN · 开始合作',
    contactTitle: '合作，从一场关于\n内容的谈话开始。',
    contactText: '告诉我们目的地、受众与期待解决的问题，我们将从文化研究与产品结构出发，寻找合适的合作方式。',
    contactButton: '预约合作沟通',
    proofTitle: '正式上线资料',
    proofItems: ['团队与顾问 · 待确认', '出版与研究 · 待确认', '已交付案例 · 待确认'],
    proofNote: '为避免制造不实背书，正式上线前仅补充经过确认的真实人物、出版物、合作方与案例材料。',
    form: {
      kicker: 'COOPERATION · 合作咨询', title: '让我们从内容开始。', description: '留下基本项目背景，我们会尽快与您联系。',
      name: '您的称呼', organization: '机构名称', email: '联系邮箱', phone: '微信 / 电话（选填）', intent: '合作方式', brief: '项目背景与需求',
      namePlaceholder: '姓名', organizationPlaceholder: '公司 / 机构', emailPlaceholder: 'name@example.com', phonePlaceholder: '微信号或联系电话', briefPlaceholder: '目的地、目标客群、合作目标和大致时间',
      submit: '提交合作意向', submitting: '正在提交…', success: '已收到您的合作咨询。', successBody: '感谢关注，我们会尽快与您联系。', again: '返回网站',
    },
  },
  en: {
    nav: ['About', 'Capabilities', 'Product Studio', 'Into Jiangnan', 'Partnership'],
    chapterNames: ['Guanzhi', 'About', 'Capabilities', 'Studio', 'Jiangnan', 'Prototype', 'Partnership', 'Contact'],
    heroSub: 'Experiences that let people enter, understand and remember Chinese culture.',
    heroIntro: 'A cultural experience product studio for travel companies, hospitality brands, membership organisations and destinations.',
    explore: 'Explore our studio', inquiry: 'Partnership inquiry', scroll: 'SCROLL TO ENTER',
    aboutKicker: 'WHO WE ARE', aboutTitle: 'We do not add culture to an itinerary.\nWe let travel enter culture.',
    principles: ['Find an entrance into culture', 'Build deliverable products for institutions', 'Translate accurately across contexts'],
    capabilityKicker: 'RESEARCH & DELIVERY', capabilityTitle: 'From cultural themes\nto deliverable experiences.',
    capabilityFallback: ['Cultural research and themes', 'Narrative systems and experience flows', 'People, settings and resources', 'Cross-cultural translation', 'Manuals, SOPs and delivery', 'Quality evaluation and iteration'],
    studioKicker: 'PRODUCT STUDIO', studioTitle: 'We do not list itineraries.\nWe study how culture can be experienced.', studioNote: 'These themes are under research, validation and co-development.',
    jiangnanKicker: 'FLAGSHIP PROGRAM', conceptKicker: 'CONCEPT PROTOTYPE', conceptTitle: 'Hanshan Night Bell', conceptTag: 'IN DEVELOPMENT · NOT YET FOR SALE',
    conceptDescription: 'A 90-minute to half-day prototype built around bells, night, waterside space, poetry and local history.',
    conceptMeta: [['SENSORY CUES', 'BELL · NIGHT · WATER'], ['PRODUCT SCALE', '90 MIN — HALF DAY']],
    coopKicker: 'CO-CREATION', coopTitle: 'Organising content, resources and delivery\ninto products that can grow together.',
    coopModes: ['Commissioned R&D', 'Co-production', 'Content licensing', 'White label', 'Per group / per guest', 'Training & delivery'], process: ['Discuss', 'Design', 'Pilot', 'Deliver', 'Iterate'],
    contactKicker: 'LET THE CONVERSATION BEGIN', contactTitle: 'Partnership begins with\na conversation about content.',
    contactText: 'Tell us about the destination, audience and problem to solve. We will explore the right collaboration model from research and product structure.', contactButton: 'Start a conversation',
    proofTitle: 'Launch materials', proofItems: ['Team & advisers · To confirm', 'Publications & research · To confirm', 'Delivered cases · To confirm'], proofNote: 'Only verified people, publications, partners and cases will be added before launch.',
    form: {
      kicker: 'COOPERATION · PARTNERSHIP INQUIRY', title: 'Let us begin with content.', description: 'Share a short project brief and we will get back to you.',
      name: 'Your name', organization: 'Organisation', email: 'Email', phone: 'WeChat / phone (optional)', intent: 'Partnership model', brief: 'Project brief',
      namePlaceholder: 'Name', organizationPlaceholder: 'Company / organisation', emailPlaceholder: 'name@example.com', phonePlaceholder: 'WeChat ID or phone', briefPlaceholder: 'Destination, audience, objective and approximate timing',
      submit: 'Send inquiry', submitting: 'Sending…', success: 'Your inquiry has been received.', successBody: 'Thank you. We will be in touch shortly.', again: 'Return to website',
    },
  },
} as const;

const intentValues = ['custom-rd', 'co-production', 'licensing', 'white-label', 'per-group', 'training'] as const;

function lines(value: string) {
  return value.split('\n').map((line, index, all) => <Fragment key={`${line}-${index}`}>{line}{index < all.length - 1 && <br />}</Fragment>);
}

function scrollToChapter(index: number) {
  document.getElementById(`chapter-${index + 1}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function chapterStyle(index: number) {
  return { '--chapter-image': `url("${chapterBackgrounds[index]}")` } as React.CSSProperties;
}

export default function App() {
  const [home, setHome] = useState<HomeContent>(FALLBACK_HOME_ZH);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<ContentLocale | null>(null);
  const [localeError, setLocaleError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const localeController = useRef<AbortController | null>(null);
  const locale = home.locale;
  const text = copy[locale];
  const ui = UI_TEXT[locale];
  const brandZh = settings.brand.name?.['zh-CN'] ?? FALLBACK_SETTINGS.brand.name!['zh-CN'];
  const brandEn = settings.brand.name?.en ?? FALLBACK_SETTINGS.brand.name!.en!;
  const legalName = locale === 'en' ? settings.company.legalName?.en ?? FALLBACK_SETTINGS.company.legalName!.en! : settings.company.legalName?.['zh-CN'] ?? FALLBACK_SETTINGS.company.legalName!['zh-CN'];
  const email = settings.contact.email ?? FALLBACK_SETTINGS.contact.email!;
  const hero = home.hero;
  const about = home.about;
  const capabilities = home.capabilities;
  const motifs = home.motifs;
  const jiangnan = home.jiangnan;
  const partners = home.partners;
  const contact = home.contact;

  const chapterTones = useMemo(() => ['dark', 'light', 'dark', 'light', 'dark', 'dark', 'dark', 'dark'] as const, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHomeContent('zh-CN', controller.signal).then(setHome).catch(() => undefined);
    void loadSiteSettingsOrFallback(controller.signal).then(setSettings);
    return () => { controller.abort(); localeController.current?.abort(); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = home.seo.title ?? home.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = home.seo.description ?? '';
  }, [home, locale]);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('.chapter')];
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index ?? 0));
    }), { rootMargin: '-38% 0px -44% 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('overlay-open', menuOpen || formOpen);
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); setFormOpen(false); } };
    window.addEventListener('keydown', close);
    return () => { document.body.classList.remove('overlay-open'); window.removeEventListener('keydown', close); };
  }, [menuOpen, formOpen]);

  async function changeLocale(target: ContentLocale) {
    if (target === locale || switchingTo) return;
    localeController.current?.abort();
    const controller = new AbortController();
    localeController.current = controller;
    setSwitchingTo(target); setLocaleError(false);
    const result = await switchHomeLocale(home, target, controller.signal);
    if (!controller.signal.aborted) {
      if (result.failed) setLocaleError(true); else { setHome(result.content); setMenuOpen(false); }
      setSwitchingTo(null);
    }
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') ?? '').trim(), organization: String(data.get('organization') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(), contact: String(data.get('phone') ?? '').trim() || undefined,
      intent: String(data.get('intent') ?? 'custom-rd'), message: String(data.get('brief') ?? '').trim(), locale,
      sourceUrl: window.location.href, website: '',
    };
    if (payload.name.length < 2 || payload.name.length > 80 || payload.organization.length < 2 || payload.organization.length > 160) { setSubmitError(locale === 'en' ? 'Please complete your name and organisation within the indicated limits.' : '请按要求填写姓名和机构名称。'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 254) { setSubmitError(ui.inquiry.emailError); return; }
    if (payload.contact && (payload.contact.length < 6 || payload.contact.length > 100)) { setSubmitError(locale === 'en' ? 'Please enter at least 6 characters for WeChat or phone.' : '微信号或联系电话请至少填写 6 个字符。'); return; }
    if ((payload.message ?? '').length < 6 || (payload.message ?? '').length > 2000) { setSubmitError(ui.inquiry.briefError); return; }
    submittingRef.current = true; setSubmitting(true); setSubmitError('');
    try {
      const response = await fetch('/api/v1/inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null) as { ok?: boolean; error?: { message?: string } } | null;
      if (!response.ok || !result?.ok) {
        if (response.status === 429) throw new Error(ui.inquiry.rateError);
        if (response.status >= 500) throw new Error(ui.inquiry.serverError);
        throw new Error(ui.inquiry.validationError);
      }
      form.reset(); setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error && !/fetch|network/i.test(error.message) ? error.message : ui.inquiry.networkError(email));
    } finally { submittingRef.current = false; setSubmitting(false); }
  }

  const openForm = () => { setMenuOpen(false); setSubmitted(false); setSubmitError(''); setFormOpen(true); };
  const navigate = (index: number) => { setMenuOpen(false); scrollToChapter(index); };

  return (
    <main className={`site-shell tone-${chapterTones[active]}`}>
      <a className="skip-link" href="#chapter-1">{locale === 'en' ? 'Skip to content' : '跳至正文'}</a>
      <header className="site-header">
        <button className="brand-lockup" onClick={() => navigate(0)} aria-label={ui.homeLabel}><span className="brand-mark">{locale === 'en' ? brandEn : brandZh}</span><span className="brand-en">{locale === 'en' ? brandZh : brandEn}</span></button>
        <nav className={`top-nav${menuOpen ? ' is-open' : ''}`} aria-label={ui.navigationLabel}>
          {[1, 2, 3, 4, 6].map((target, index) => <button key={target} onClick={() => navigate(target)}>{text.nav[index]}</button>)}
          <button className="nav-contact" onClick={openForm}>{text.inquiry}</button>
          <div className="mobile-language" role="group" aria-label={ui.languageLabel}><button aria-pressed={locale === 'zh-CN'} onClick={() => void changeLocale('zh-CN')}>中文</button><span>/</span><button aria-pressed={locale === 'en'} onClick={() => void changeLocale('en')}>EN</button></div>
        </nav>
        <div className="language-switch" role="group" aria-label={ui.languageLabel}><button aria-pressed={locale === 'zh-CN'} disabled={Boolean(switchingTo)} onClick={() => void changeLocale('zh-CN')}>中</button><span>/</span><button aria-pressed={locale === 'en'} disabled={Boolean(switchingTo)} onClick={() => void changeLocale('en')}>EN</button></div>
        <button className="menu-toggle" aria-label={menuOpen ? ui.menuClose : ui.menuOpen} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><i /><i /></button>
      </header>
      {(switchingTo || localeError) && <div className={`locale-status${localeError ? ' is-error' : ''}`} role="status">{switchingTo ? ui.switching : ui.switchFailed}</div>}

      <aside className="chapter-rail" aria-label={locale === 'en' ? 'Chapter navigation' : '章节导航'}><span className="rail-line"><i style={{ transform: `scaleY(${(active + 1) / 8})` }} /></span>{text.chapterNames.map((name, index) => <button key={name} className={active === index ? 'is-active' : ''} aria-label={`${index + 1}. ${name}`} aria-current={active === index ? 'step' : undefined} onClick={() => navigate(index)}><span>{String(index + 1).padStart(2, '0')}</span><small>{name}</small></button>)}</aside>

      <section id="chapter-1" className="chapter chapter-dark chapter-hero" data-index="0" style={chapterStyle(0)}>
        <div className="chapter-image" aria-hidden="true" /><div className="chapter-overlay" />
        <div className="chapter-content hero-content"><p className="eyebrow">ORIENTAL CULTURAL EXPERIENCE · {hero?.eyebrow}</p><h1>{locale === 'en' ? brandEn : brandZh}</h1><p className="hero-subtitle">{text.heroSub}</p><p className="hero-intro">{text.heroIntro}</p><div className="action-row"><button className="primary-action" onClick={openForm}>{hero?.primaryCta.label ?? text.inquiry}<span>↗</span></button><button className="text-action" onClick={() => navigate(2)}>{hero?.secondaryCta?.label ?? text.explore}<span>→</span></button></div></div>
        <button className="scroll-cue" onClick={() => navigate(1)}><span>{text.scroll}</span><i /></button><span className="chapter-number">01<i>/ 08</i></span>
      </section>

      <section id="chapter-2" className="chapter chapter-light chapter-about" data-index="1" style={chapterStyle(1)}><div className="chapter-image" aria-hidden="true" /><div className="chapter-overlay" /><div className="chapter-content content-left ink-content"><p className="eyebrow">{text.aboutKicker}</p><h2>{lines(text.aboutTitle)}</h2><p className="lead">{about?.paragraphs[0] ?? about?.lead}</p><div className="statement-grid">{text.principles.map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}</div></div><span className="chapter-number is-dark">02<i>/ 08</i></span></section>

      <section id="chapter-3" className="chapter chapter-dark chapter-capabilities" data-index="2" style={chapterStyle(2)}><div className="chapter-image" aria-hidden="true" /><div className="chapter-overlay" /><div className="chapter-content content-left"><p className="eyebrow">{text.capabilityKicker}</p><h2>{lines(text.capabilityTitle)}</h2><p className="lead narrow">{capabilities?.intro}</p><div className="capability-list">{(capabilities?.items.map((item) => item.title) ?? text.capabilityFallback).slice(0, 6).map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></div>)}</div></div><span className="chapter-number">03<i>/ 08</i></span></section>

      <section id="chapter-4" className="chapter chapter-light chapter-studio" data-index="3" style={chapterStyle(3)}><div className="chapter-image" aria-hidden="true" /><div className="chapter-overlay" /><div className="chapter-content content-left ink-content"><p className="eyebrow">{text.studioKicker}</p><h2>{lines(text.studioTitle)}</h2><p className="lead narrow">{motifs?.intro ?? text.studioNote}</p><div className="theme-index">{motifs?.items.slice(0, 5).map((motif, index) => <div key={motif.id}><span>{String(index + 1).padStart(2, '0')}</span><b>{motif.title}</b><small>{motif.titleEn}</small></div>)}</div></div><span className="chapter-number is-dark">04<i>/ 08</i></span></section>

      <section id="chapter-5" className="chapter chapter-dark chapter-jiangnan" data-index="4" style={chapterStyle(4)}><div className="chapter-image" aria-hidden="true" /><div className="chapter-overlay" /><div className="chapter-content content-left"><p className="eyebrow">{text.jiangnanKicker}</p><h2 className="program-title">{locale === 'en' ? (settings.flagship.name?.en ?? 'Into Jiangnan') : (settings.flagship.name?.['zh-CN'] ?? '入江南')}</h2><p className="program-line">{jiangnan?.headingLines.join(' ')}</p><p className="lead narrow">{jiangnan?.description}</p>{jiangnan?.cta && <button className="text-action light" onClick={() => navigate(6)}>{jiangnan.cta.label}<span>↗</span></button>}</div><span className="chapter-number">05<i>/ 08</i></span></section>

      <section id="chapter-6" className="chapter chapter-dark chapter-concept" data-index="5" style={chapterStyle(5)}><div className="chapter-image" aria-hidden="true" /><div className="chapter-overlay" /><div className="chapter-content content-left"><p className="eyebrow">{text.conceptKicker}</p><h2>{text.conceptTitle}</h2><span className="concept-tag">{text.conceptTag}</span><p className="lead narrow">{text.conceptDescription}</p><div className="concept-meta">{text.conceptMeta.map(([label, value]) => <span key={label}><small>{label}</small>{value}</span>)}</div></div><span className="chapter-number">06<i>/ 08</i></span></section>

      <section id="chapter-7" className="chapter chapter-dark chapter-coop" data-index="6" style={chapterStyle(6)}><div className="chapter-image" aria-hidden="true" /><div className="chapter-overlay" /><div className="chapter-content coop-content"><div className="coop-heading"><p className="eyebrow">{text.coopKicker}</p><h2>{lines(text.coopTitle)}</h2></div><div className="coop-board"><div className="coop-modes">{text.coopModes.map((mode, index) => <span key={mode}><i>{String(index + 1).padStart(2, '0')}</i>{mode}</span>)}</div><div className="partner-tags">{partners?.items.map((partner) => <span key={partner.id}>{partner.title}</span>)}</div><div className="process-line">{text.process.map((step, index) => <span key={step}><i>{index + 1}</i>{step}</span>)}</div></div></div><span className="chapter-number">07<i>/ 08</i></span></section>

      <section id="chapter-8" className="chapter chapter-dark chapter-contact" data-index="7" style={chapterStyle(7)}><div className="chapter-image" aria-hidden="true" /><div className="chapter-overlay" /><div className="chapter-content content-left contact-content"><p className="eyebrow">{text.contactKicker}</p><h2>{lines(contact?.headingLines.join('\n') || text.contactTitle)}</h2><p className="lead narrow">{contact?.description ?? text.contactText}</p><button className="primary-action" onClick={openForm}>{contact?.cta.label ?? text.contactButton}<span>↗</span></button><div className="proof-note"><p>{text.proofTitle}</p>{text.proofItems.map((item) => <span key={item}>{item}</span>)}<small>{text.proofNote}</small></div></div><footer className="site-footer"><span>{locale === 'en' ? brandEn : brandZh}</span><span>{hero?.eyebrow}</span><a href={`mailto:${email}`}>{email}</a><span>{legalName}</span></footer><span className="chapter-number">08<i>/ 08</i></span></section>

      <div className={`contact-sheet${formOpen ? ' is-open' : ''}`} aria-hidden={!formOpen}><button className="sheet-backdrop" aria-label={ui.inquiry.close} onClick={() => setFormOpen(false)} /><section role="dialog" aria-modal="true" aria-labelledby="contact-title"><button className="sheet-close" aria-label={ui.inquiry.close} onClick={() => setFormOpen(false)}>×</button>{submitted ? <div className="form-success"><p className="eyebrow">SUCCESS</p><h2 id="contact-title">{text.form.success}</h2><p>{text.form.successBody}</p><button className="primary-action" onClick={() => setFormOpen(false)}>{text.form.again}<span>→</span></button></div> : <form onSubmit={submitInquiry} noValidate><p className="eyebrow">{text.form.kicker}</p><h2 id="contact-title">{text.form.title}</h2><p className="form-description">{text.form.description}</p><div className="form-grid"><label>{text.form.name}<input name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder={text.form.namePlaceholder} /></label><label>{text.form.organization}<input name="organization" autoComplete="organization" required minLength={2} maxLength={160} placeholder={text.form.organizationPlaceholder} /></label><label className="full">{text.form.email}<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder={text.form.emailPlaceholder} /></label><label className="full">{text.form.phone}<input name="phone" autoComplete="tel" minLength={6} maxLength={100} placeholder={text.form.phonePlaceholder} /></label><label className="full">{text.form.intent}<select name="intent" defaultValue="custom-rd">{intentValues.map((value, index) => <option key={value} value={value}>{text.coopModes[index]}</option>)}</select></label><label className="full">{text.form.brief}<textarea name="brief" rows={4} required minLength={6} maxLength={2000} placeholder={text.form.briefPlaceholder} /></label></div>{submitError && <div className="form-error" role="alert">{submitError}</div>}<button className="primary-action form-submit" type="submit" disabled={submitting}>{submitting ? text.form.submitting : text.form.submit}<span>→</span></button></form>}</section></div>
    </main>
  );
}
