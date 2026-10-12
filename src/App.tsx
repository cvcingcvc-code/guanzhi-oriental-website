import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { FALLBACK_HOME_ZH, FALLBACK_SETTINGS, loadHomeContent, loadSiteSettingsOrFallback, switchHomeLocale, type ContentLocale, type HomeContent } from './content/public-content';

type PageKey = 'home' | 'about' | 'capabilities' | 'jiangnan' | 'partnership' | 'contact' | 'legal';

const routes: Record<PageKey, string> = { home: '/', about: '/about', capabilities: '/capabilities', jiangnan: '/jiangnan', partnership: '/partnership', contact: '/contact', legal: '/legal' };
const routeKeys = Object.entries(routes) as Array<[PageKey, string]>;

const copy = {
  'zh-CN': {
    nav: { home: '首页', about: '关于观止东方', capabilities: '产品与能力', jiangnan: '入江南', partnership: '合作方式', contact: '联系我们', legal: '法律与合规' },
    menu: '菜单', close: '关闭', language: '网站语言', inquiry: '预约合作洽谈', learn: '了解产品与能力', flagship: '查看入江南', more: '进一步了解', backHome: '返回首页', skip: '跳到主要内容', photoPlaceholder: '正式品牌摄影预留区域',
    home: { eyebrow: '东方文化体验产品研发与供应机构', title: '进入东方。', intro: '为国内外专业伙伴，研发可以被理解、被交付的文化体验。', role: '观止东方把文化主题、体验叙事、在地资源与交付标准，组织成可以被机构采用与持续发展的产品。', capabilityLabel: '我们如何工作', motifLabel: '持续研究的文化母题', partnerLabel: '面向机构合作', contactLabel: '从一次专业沟通开始' },
    about: { eyebrow: 'ABOUT GUANZHI ORIENTAL', title: '从文化理解出发，建立长期可交付的体验。', lead: '观止东方是北京见山观止文化有限公司面向国内外专业合作伙伴的文化体验品牌。', methodTitle: '我们的判断', method: ['文化不是景点的注释，而是体验发生的内在结构。', '产品不是素材的集合，而是内容、节奏、人员与标准的共同组织。', '合作不是一次性交付，而是建立可以被理解、执行和持续优化的系统。'], identityTitle: '品牌关系', identity: '北京见山观止文化有限公司是运营主体；观止东方是对外品牌；「入江南」是首个旗舰样板。' },
    capabilities: { eyebrow: 'PRODUCT & CAPABILITIES', title: '把文化内容，转化为合作方可以采用的产品。', intro: '从前期研究到现场交付，我们关注的不只是创意是否成立，也关注它能否被理解、执行、复制和长期维护。', flow: ['文化主题研究', '叙事与体验设计', '在地资源整合', '产品标准建立', '人员培训与交付', '运营验证与迭代'], outcomes: '可按市场、客群、目的地与渠道需求，形成标准模块或定向研发方案。' },
    jiangnan: { eyebrow: 'FLAGSHIP / INTO JIANGNAN', title: '进入江南，不是经过江南。', intro: '「入江南」不是一条景点线路，而是观止东方将文化内容转化为可交付体验产品的首个旗舰样板。', themes: ['园林与空间', '藏书与文人生活', '昆曲与声音', '茶、丝绸与手艺', '饮食与日常'], close: '它以江南为起点，让旅行者在真实生活与文化现场中，理解中国审美与精神世界。' },
    partnership: { eyebrow: 'WAYS TO PARTNER', title: '为不同机构，建立合适的合作入口。', intro: '合作可以从成熟内容采用开始，也可以从一个目的地、主题或客群的共同研发开始。', modes: [{ title: '联合出品', text: '共同定义产品、市场与交付方式，形成双方可持续运营的文化体验。' }, { title: '白标供应', text: '把成熟体验模块纳入合作方自有品牌与产品体系。' }, { title: '内容授权', text: '提供经过组织的文化叙事、体验内容与使用规范。' }, { title: '定向研发', text: '围绕特定目的地、文化主题、渠道与客群进行专项开发。' }], deck: '如需合作介绍资料或「入江南」项目简介，请在咨询中注明。资料将在确认机构与需求后发送。' },
    contact: { eyebrow: 'CONTACT', title: '让合作从一段清楚的对话开始。', intro: '请告诉我们您的机构、项目背景、目标客群和大致时间。我们会根据需求安排后续沟通。', direct: '也可直接通过邮件联系' },
    legal: { eyebrow: 'LEGAL & COMPLIANCE', title: '法律与合规', privacy: '隐私说明', privacyText: '网站仅收集您主动提交的姓名或机构名称、联系邮箱及合作需求，用于回复咨询和后续商务沟通。未经授权，我们不会将咨询信息用于公开展示。', use: '网站使用', useText: '网站内容用于介绍观止东方的品牌、能力与合作方向。未经书面许可，不得复制或用于误导性商业表达。', cookies: 'Cookie 与技术信息', cookiesText: '当前公开网站不设置广告追踪。为保障网站运行，托管服务可能记录必要的访问与安全日志。', update: '本页将根据正式运营、托管与隐私流程持续完善。' },
    form: { kicker: 'PARTNERSHIP INQUIRY', title: '预约合作洽谈', name: '姓名或机构', namePlaceholder: '您的姓名 / 机构名称', email: '联系邮箱', brief: '合作需求', briefPlaceholder: '请简要介绍项目背景、目标客群与时间', submit: '提交合作意向', submitting: '正在提交…', sent: '合作咨询已提交，我们会尽快与您联系。', required: '请完整填写姓名或机构、有效邮箱与合作需求。', failed: '暂时无法提交，请稍后再试或直接发送邮件。' },
    footer: { statement: '把东方文化，转化为可以进入的旅行体验。', operated: '运营主体' },
  },
  en: {
    nav: { home: 'Home', about: 'About', capabilities: 'Capabilities', jiangnan: 'Into Jiangnan', partnership: 'Partnership', contact: 'Contact', legal: 'Legal' },
    menu: 'Menu', close: 'Close', language: 'Website language', inquiry: 'Start a Partnership Conversation', learn: 'Explore Our Capabilities', flagship: 'View Into Jiangnan', more: 'Learn more', backHome: 'Back to home', skip: 'Skip to main content', photoPlaceholder: 'Reserved for approved brand photography',
    home: { eyebrow: 'CULTURAL EXPERIENCE PRODUCT R&D & SUPPLY', title: 'Enter the East.', intro: 'Cultural experiences designed to be understood, delivered and sustained by professional partners.', role: 'Guanzhi Oriental brings cultural themes, experience narratives, local resources and delivery standards together as products institutions can adopt and grow.', capabilityLabel: 'How we work', motifLabel: 'Cultural motifs in development', partnerLabel: 'Built for institutional partnership', contactLabel: 'Begin with a professional conversation' },
    about: { eyebrow: 'ABOUT GUANZHI ORIENTAL', title: 'From cultural understanding to experiences built to last.', lead: 'Guanzhi Oriental is the cultural experience brand of Beijing Jianshan Guanzhi Culture Co., Ltd., created for professional partners in China and abroad.', methodTitle: 'What we believe', method: ['Culture is not a caption for a sight; it is the inner structure of an experience.', 'A product is not a collection of materials; it aligns content, rhythm, people and standards.', 'Partnership is not a one-off delivery; it builds a system that can be understood, operated and improved.'], identityTitle: 'Brand architecture', identity: 'Beijing Jianshan Guanzhi Culture Co., Ltd. is the operating entity; Guanzhi Oriental is the public brand; Into Jiangnan is its first flagship.' },
    capabilities: { eyebrow: 'PRODUCT & CAPABILITIES', title: 'Turning cultural content into products partners can use.', intro: 'From early research to live delivery, we ask not only whether an idea is compelling, but whether it can be understood, executed, repeated and maintained.', flow: ['Cultural research', 'Narrative & experience design', 'Local resource integration', 'Product standards', 'Training & delivery', 'Operational iteration'], outcomes: 'Programs can become standard modules or bespoke developments shaped around a market, audience, destination or channel.' },
    jiangnan: { eyebrow: 'FLAGSHIP / INTO JIANGNAN', title: 'Enter Jiangnan. Do not merely pass through.', intro: 'Into Jiangnan is not a sightseeing route. It is Guanzhi Oriental’s first flagship demonstration of cultural content becoming a deliverable experience product.', themes: ['Gardens & space', 'Libraries & literati life', 'Kunqu & sound', 'Tea, silk & craft', 'Food & everyday life'], close: 'Beginning in Jiangnan, it invites travelers into lived culture and real places to understand Chinese aesthetics and ways of life.' },
    partnership: { eyebrow: 'WAYS TO PARTNER', title: 'A fitting way to work with every institution.', intro: 'Partnership may begin with proven content, or with the joint development of a place, theme or audience.', modes: [{ title: 'Co-creation', text: 'Define the product, market and delivery model together for long-term operation.' }, { title: 'White-label supply', text: 'Bring mature experience modules into your own brand and portfolio.' }, { title: 'Content licensing', text: 'Use structured cultural narratives, experience content and clear guidelines.' }, { title: 'Bespoke R&D', text: 'Commission development around a destination, cultural theme, channel or audience.' }], deck: 'To request a partnership deck or an Into Jiangnan introduction, mention it in your inquiry. Materials are shared after we understand your organization and needs.' },
    contact: { eyebrow: 'CONTACT', title: 'Let partnership begin with a clear conversation.', intro: 'Tell us about your organization, project context, audience and approximate timing. We will arrange the right next conversation.', direct: 'Or contact us directly by email' },
    legal: { eyebrow: 'LEGAL & COMPLIANCE', title: 'Legal & compliance', privacy: 'Privacy', privacyText: 'We collect only the name or organization, email and project information you choose to submit, solely to respond to inquiries and continue business conversations.', use: 'Website use', useText: 'Content introduces the Guanzhi Oriental brand, capabilities and partnership direction. It may not be copied or used in misleading commercial communications without written permission.', cookies: 'Cookies & technical data', cookiesText: 'The public website currently uses no advertising trackers. Hosting services may record essential access and security logs.', update: 'This page will be updated as formal operating, hosting and privacy procedures are confirmed.' },
    form: { kicker: 'PARTNERSHIP INQUIRY', title: 'Start a partnership conversation', name: 'Name or organization', namePlaceholder: 'Your name / organization', email: 'Email', brief: 'Partnership needs', briefPlaceholder: 'Project context, audience and timing', submit: 'Send inquiry', submitting: 'Sending…', sent: 'Your inquiry has been received. We will be in touch shortly.', required: 'Please provide a name or organization, valid email and project brief.', failed: 'Unable to send right now. Please try again or email us directly.' },
    footer: { statement: 'Turning Eastern culture into travel experiences people can enter.', operated: 'Operated by' },
  },
} as const;

function pageFromPath(pathname: string): PageKey {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return routeKeys.find(([, path]) => path === normalized)?.[0] ?? 'home';
}

function lines(value: string[]) { return value.map((line, index) => <span key={`${index}-${line}`}>{line}</span>); }

export default function App() {
  const [page, setPage] = useState<PageKey>(() => pageFromPath(window.location.pathname));
  const [home, setHome] = useState<HomeContent>(FALLBACK_HOME_ZH);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'sent' | 'error'>('idle');
  const [localeError, setLocaleError] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const locale = home.locale;
  const t = copy[locale];
  const brandZh = settings.brand.name?.['zh-CN'] ?? '观止东方';
  const brandEn = settings.brand.name?.en ?? 'Guanzhi Oriental';
  const legalName = locale === 'en' ? settings.company.legalName?.en ?? settings.company.legalName?.['zh-CN'] : settings.company.legalName?.['zh-CN'];
  const email = settings.contact.email ?? 'hello@guanzhidongfang.com';

  useEffect(() => {
    const controller = new AbortController();
    void loadHomeContent('zh-CN', controller.signal).then(setHome).catch(() => undefined);
    void loadSiteSettingsOrFallback(controller.signal).then(setSettings);
    const onPop = () => { setPage(pageFromPath(window.location.pathname)); setMenuOpen(false); window.scrollTo(0, 0); };
    window.addEventListener('popstate', onPop);
    return () => { controller.abort(); window.removeEventListener('popstate', onPop); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.body.classList.toggle('dialog-open', dialogOpen);
    document.title = `${t.nav[page]}｜${locale === 'en' ? brandEn : brandZh}`;
    return () => document.body.classList.remove('dialog-open');
  }, [brandEn, brandZh, dialogOpen, locale, page, t.nav]);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog();
      if (event.key === 'Tab' && dialogRef.current) {
        const items = [...dialogRef.current.querySelectorAll<HTMLElement>('button,input,textarea,a[href]')].filter((item) => !item.hasAttribute('disabled'));
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); items[0]?.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const firstLink = document.querySelector<HTMLElement>('#primary-navigation a');
    requestAnimationFrame(() => firstLink?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      requestAnimationFrame(() => menuTriggerRef.current?.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const navigate = (target: PageKey) => {
    if (window.location.pathname !== routes[target]) window.history.pushState({}, '', routes[target]);
    setPage(target); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      requestAnimationFrame(() => menuTriggerRef.current?.focus());
      return;
    }
    setMenuOpen(true);
  };
  const openDialog = (trigger?: HTMLElement | null) => { triggerRef.current = trigger ?? document.activeElement as HTMLElement; setFormState('idle'); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); };
  const changeLocale = async (target: ContentLocale) => {
    if (target === locale) return;
    setLocaleError(false);
    const controller = new AbortController();
    const result = await switchHomeLocale(home, target, controller.signal);
    if (result.failed) setLocaleError(true); else setHome(result.content);
  };
  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim(); const contact = String(data.get('contact') ?? '').trim(); const brief = String(data.get('brief') ?? '').trim();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || brief.length < 6) { setFormState('error'); return; }
    setSubmitting(true); setFormState('idle');
    try {
      const response = await fetch('/api/v1/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, organization: name, email: contact, contact, intent: 'other', message: brief, locale, sourceUrl: window.location.href, website: '' }) });
      if (!response.ok) throw new Error(); setFormState('sent'); form.reset();
    } catch { setFormState('error'); } finally { setSubmitting(false); }
  };

  const link = (key: PageKey, className?: string) => <a className={className} href={routes[key]} onClick={(event) => { event.preventDefault(); navigate(key); }}>{t.nav[key]}</a>;
  const pageBody = page === 'home' ? <HomePage home={home} t={t} navigate={navigate} openDialog={openDialog} brandZh={brandZh} brandEn={brandEn} />
    : page === 'about' ? <AboutPage home={home} t={t} />
    : page === 'capabilities' ? <CapabilitiesPage home={home} t={t} />
    : page === 'jiangnan' ? <JiangnanPage home={home} t={t} openDialog={openDialog} />
    : page === 'partnership' ? <PartnershipPage home={home} t={t} openDialog={openDialog} />
    : page === 'contact' ? <ContactPage t={t} email={email} openDialog={openDialog} />
    : <LegalPage t={t} />;

  return <div className="site-shell">
    <a className="skip-link" href="#main-content">{t.skip}</a>
    <header className="site-header">
      <a className="wordmark" href="/" onClick={(event) => { event.preventDefault(); navigate('home'); }}><span>{brandZh}</span><small>{brandEn}</small></a>
      <nav id="primary-navigation" className={menuOpen ? 'site-nav is-open' : 'site-nav'} aria-label={t.language}>{(['about', 'capabilities', 'jiangnan', 'partnership', 'contact'] as PageKey[]).map((key) => <span className={page === key ? 'active' : ''} key={key}>{link(key)}</span>)}</nav>
      <div className="header-tools"><div className="language-switch" aria-label={t.language}><button aria-pressed={locale === 'zh-CN'} onClick={() => void changeLocale('zh-CN')}>中</button><i>/</i><button aria-pressed={locale === 'en'} onClick={() => void changeLocale('en')}>EN</button></div><button className="header-inquiry" onClick={(event) => openDialog(event.currentTarget)}>{t.inquiry}</button><button ref={menuTriggerRef} className="menu-toggle" aria-controls="primary-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? t.close : t.menu} onClick={toggleMenu}><span/><span/></button></div>
      {localeError && <p className="locale-note" role="status">English content is not yet available from the CMS.</p>}
    </header>
    <main id="main-content">{pageBody}</main>
    <footer className="site-footer"><div><p>{t.footer.statement}</p><a href={`mailto:${email}`}>{email}</a></div><div className="footer-links">{link('legal')}<span>{t.footer.operated}：{legalName}</span><span>© 2026 {brandEn}</span></div></footer>
    {dialogOpen && <div className="dialog-backdrop" onMouseDown={closeDialog}><div ref={dialogRef} className="inquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={closeDialog} aria-label={t.close}>×</button>{formState === 'sent' ? <div className="form-result"><p>01 / RECEIVED</p><h2 id="dialog-title">{t.form.sent}</h2><button onClick={closeDialog}>{t.close}</button></div> : <form onSubmit={submitInquiry} noValidate><p className="page-eyebrow">{t.form.kicker}</p><h2 id="dialog-title">{t.form.title}</h2><label>{t.form.name}<input autoFocus name="name" placeholder={t.form.namePlaceholder}/></label><label>{t.form.email}<input name="contact" type="email" placeholder="name@example.com"/></label><label>{t.form.brief}<textarea name="brief" rows={5} placeholder={t.form.briefPlaceholder}/></label>{formState === 'error' && <p className="form-error" role="alert">{t.form.failed}</p>}<button className="submit-button" disabled={submitting}>{submitting ? t.form.submitting : t.form.submit}<span>↗</span></button></form>}</div></div>}
  </div>;
}

type PageProps = { home: HomeContent; t: typeof copy['zh-CN'] | typeof copy.en };
function PageIntro({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children?: ReactNode }) { return <header className="page-intro"><p className="page-eyebrow">{eyebrow}</p><h1>{title}</h1>{intro && <p className="page-lead">{intro}</p>}{children}</header>; }

function HomePage({ home, t, navigate, openDialog, brandZh, brandEn }: PageProps & { navigate: (key: PageKey) => void; openDialog: (trigger?: HTMLElement | null) => void; brandZh: string; brandEn: string }) {
  const positioning = home.hero?.eyebrow ?? t.home.eyebrow;
  const description = home.hero?.headingLines.join(' ') ?? t.home.intro;
  return <>
    <section className="home-hero"><div className="home-hero-copy"><p className="hero-brand"><span>{brandZh}</span><small>{brandEn}</small></p><h1>{positioning}</h1><p className="hero-description">{description}</p><div className="hero-actions"><button className="primary-button" onClick={(event) => openDialog(event.currentTarget)}>{t.inquiry}<span aria-hidden="true">↗</span></button><button className="hero-text-link" onClick={() => navigate('capabilities')}>{t.learn}<span aria-hidden="true">→</span></button></div></div><div className="hero-media-placeholder" role="img" aria-label={t.photoPlaceholder}><span aria-hidden="true"/></div></section>
    <section className="home-capabilities"><header><p className="page-eyebrow">02 / {t.home.capabilityLabel}</p><h2>{home.capabilities ? lines(home.capabilities.headingLines) : t.capabilities.title}</h2><p>{home.capabilities?.intro}</p></header><div className="capability-rows">{home.capabilities?.items.map((item) => <article key={item.id}><span>{item.number}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div><button className="text-link" onClick={() => navigate('capabilities')}>{t.more}<span>↗</span></button></section>
    <section className="home-jiangnan"><div className="home-jiangnan-image">{home.jiangnan && <img src={home.jiangnan.media.url} alt={home.jiangnan.media.alt}/>}</div><div className="home-jiangnan-copy"><p className="page-eyebrow">03 / {t.home.motifLabel}</p><h2>{t.jiangnan.title}</h2><p>{home.jiangnan?.description ?? t.jiangnan.intro}</p><button className="text-link" onClick={() => navigate('jiangnan')}>{t.flagship}<span>↗</span></button></div></section>
    <section className="home-partner"><p className="page-eyebrow">04 / {t.home.partnerLabel}</p><h2>{home.partners?.heading ?? t.partnership.title}</h2><div className="audience-list">{home.partners?.items.map((item, index) => <span key={item.id}><b>0{index + 1}</b>{item.title}</span>)}</div><div className="home-contact-line"><p>{t.home.contactLabel}</p><button className="primary-button" onClick={(event) => openDialog(event.currentTarget)}>{t.inquiry}<span>↗</span></button></div></section>
  </>;
}

function AboutPage({ home, t }: PageProps) { return <div className="inner-page"><PageIntro eyebrow={t.about.eyebrow} title={t.about.title} intro={t.about.lead}/><section className="about-story"><div><p className="section-index">01 / PROFILE</p>{home.about?.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><aside><p className="section-index">02 / {t.about.identityTitle}</p><h2>{home.about?.statement?.value ?? '入江南'}</h2><p>{t.about.identity}</p></aside></section><section className="beliefs"><header><p className="section-index">03 / METHOD</p><h2>{t.about.methodTitle}</h2></header>{t.about.method.map((item, index) => <article key={item}><span>0{index + 1}</span><p>{item}</p></article>)}</section></div>; }

function CapabilitiesPage({ home, t }: PageProps) { return <div className="inner-page"><PageIntro eyebrow={t.capabilities.eyebrow} title={t.capabilities.title} intro={t.capabilities.intro}/><section className="capability-detail">{home.capabilities?.items.map((item, index) => <article key={item.id}><div><span>{item.number}</span><p>CAPABILITY 0{index + 1}</p></div><h2>{item.title}</h2><p>{item.description}</p></article>)}</section><section className="process"><header><p className="section-index">05 / PROCESS</p><h2>{home.capabilities ? lines(home.capabilities.headingLines) : t.capabilities.title}</h2></header><ol>{t.capabilities.flow.map((step) => <li key={step}>{step}</li>)}</ol><p>{t.capabilities.outcomes}</p></section></div>; }

function JiangnanPage({ home, t, openDialog }: PageProps & { openDialog: (trigger?: HTMLElement | null) => void }) { const block = home.jiangnan; return <div className="jiangnan-page"><section className="jiangnan-hero">{block && <img src={block.media.url} alt={block.media.alt}/>}<div><p className="page-eyebrow">{t.jiangnan.eyebrow}</p><h1>{t.jiangnan.title}</h1><p>{t.jiangnan.intro}</p></div></section><section className="jiangnan-narrative"><p className="section-index">01 / CULTURAL EXPERIENCE</p><h2>{block ? lines(block.headingLines) : t.jiangnan.title}</h2><p>{block?.description}</p></section><section className="jiangnan-themes"><p className="section-index">02 / THEMES</p>{t.jiangnan.themes.map((theme, index) => <article key={theme}><span>0{index + 1}</span><h3>{theme}</h3></article>)}</section><section className="page-cta"><p>{t.jiangnan.close}</p><button className="primary-button" onClick={(event) => openDialog(event.currentTarget)}>{t.inquiry}<span>↗</span></button></section></div>; }

function PartnershipPage({ home, t, openDialog }: PageProps & { openDialog: (trigger?: HTMLElement | null) => void }) { return <div className="inner-page"><PageIntro eyebrow={t.partnership.eyebrow} title={t.partnership.title} intro={t.partnership.intro}/><section className="partnership-grid">{t.partnership.modes.map((mode, index) => <article key={mode.title}><span>0{index + 1}</span><h2>{mode.title}</h2><p>{mode.text}</p></article>)}</section><section className="partner-types"><header><p className="section-index">05 / PARTNERS</p><h2>{home.partners?.heading}</h2></header><div>{home.partners?.items.map((item) => <p key={item.id}>{item.title}</p>)}</div></section><section className="deck-callout"><p>{t.partnership.deck}</p><button className="primary-button" onClick={(event) => openDialog(event.currentTarget)}>{t.inquiry}<span>↗</span></button></section></div>; }

function ContactPage({ t, email, openDialog }: { t: typeof copy['zh-CN'] | typeof copy.en; email: string; openDialog: (trigger?: HTMLElement | null) => void }) { return <div className="contact-page"><PageIntro eyebrow={t.contact.eyebrow} title={t.contact.title} intro={t.contact.intro}/><section className="contact-panel"><div><p className="section-index">01 / EMAIL</p><p>{t.contact.direct}</p><a href={`mailto:${email}`}>{email}</a></div><div><p className="section-index">02 / INQUIRY</p><button className="primary-button" onClick={(event) => openDialog(event.currentTarget)}>{t.inquiry}<span>↗</span></button></div></section></div>; }

function LegalPage({ t }: { t: typeof copy['zh-CN'] | typeof copy.en }) { return <div className="inner-page legal-page"><PageIntro eyebrow={t.legal.eyebrow} title={t.legal.title}/><section><article><span>01</span><h2>{t.legal.privacy}</h2><p>{t.legal.privacyText}</p></article><article><span>02</span><h2>{t.legal.use}</h2><p>{t.legal.useText}</p></article><article><span>03</span><h2>{t.legal.cookies}</h2><p>{t.legal.cookiesText}</p></article><p className="legal-update">{t.legal.update}</p></section></div>; }
