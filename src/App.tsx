import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  FALLBACK_HOME_ZH,
  FALLBACK_SETTINGS,
  loadHomeContent,
  loadSiteSettingsOrFallback,
  switchHomeLocale,
  type ContentCta,
  type ContentLocale,
  type HomeBlock,
  type HomeContent,
} from './content/public-content';
import { UI_TEXT } from './i18n/ui';
import { InquiryDialog } from './public/InquiryDialog';
import { resolveCta } from './public/cta';
import { blockMap, isRouteAvailable, publicPages } from './public/page-model';
import './client-overrides.css';

const pageImages = {
  '/': '/images/client-design/chapter-1.webp',
  '/about': '/images/client-design/chapter-2.webp',
  '/capabilities': '/images/client-design/chapter-3.webp',
  '/into-jiangnan': '/images/client-design/chapter-5.webp',
  '/partners': '/images/client-design/chapter-7.webp',
  '/contact': '/images/client-design/chapter-8.webp',
} as const;

const uiCopy = {
  'zh-CN': {
    brandLine: '让人进入、理解，并记住东方文化。', overview: '探索观止东方', readMore: '了解更多', notFound: '此页面暂无已发布内容。', backHome: '返回首页',
    capabilities: '研发能力', studio: '产品实验室', partners: '合作对象', contact: '开始合作', menu: '网站菜单',
  },
  en: {
    brandLine: 'Experiences that let people enter, understand and remember Chinese culture.', overview: 'Explore Guanzhi Oriental', readMore: 'Learn more', notFound: 'No published content is available for this page.', backHome: 'Back to home',
    capabilities: 'Capabilities', studio: 'Product Studio', partners: 'Partners', contact: 'Start a conversation', menu: 'Site menu',
  },
} as const;

function heading(lines: string[]) {
  return lines.map((line, index) => <Fragment key={`${line}-${index}`}>{line}{index < lines.length - 1 && <br />}</Fragment>);
}

function PageImage({ path, alt, eager = false }: { path: keyof typeof pageImages; alt: string; eager?: boolean }) {
  return <div className="page-visual"><img src={pageImages[path]} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" /></div>;
}

function CtaButton({ cta, run, className = 'primary-action' }: { cta?: ContentCta; run: (cta: ContentCta, trigger: HTMLElement) => void; className?: string }) {
  if (!cta) return null;
  return <button className={className} onClick={(event) => run(cta, event.currentTarget)}>{cta.label}<span>↗</span></button>;
}

function NotFound({ locale }: { locale: ContentLocale }) {
  const text = uiCopy[locale];
  return <section id="main-content" className="route-page empty-page"><p className="eyebrow">404</p><h1>{text.notFound}</h1><NavLink className="primary-action" to="/">{text.backHome}<span>→</span></NavLink></section>;
}

export default function App() {
  const [home, setHome] = useState<HomeContent>(FALLBACK_HOME_ZH);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTrigger, setDialogTrigger] = useState<HTMLElement | null>(null);
  const [switchingTo, setSwitchingTo] = useState<ContentLocale | null>(null);
  const [localeError, setLocaleError] = useState(false);
  const localeController = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const locale = home.locale;
  const ui = UI_TEXT[locale];
  const text = uiCopy[locale];
  const blocks = useMemo(() => blockMap(home), [home]);
  const pages = useMemo(() => publicPages(home), [home]);
  const brandZh = settings.brand.name?.['zh-CN'] ?? FALLBACK_SETTINGS.brand.name!['zh-CN'];
  const brandEn = settings.brand.name?.en ?? FALLBACK_SETTINGS.brand.name!.en!;
  const legalName = locale === 'en' ? settings.company.legalName?.en ?? FALLBACK_SETTINGS.company.legalName!.en! : settings.company.legalName?.['zh-CN'] ?? FALLBACK_SETTINGS.company.legalName!['zh-CN'];
  const email = settings.contact.email ?? FALLBACK_SETTINGS.contact.email!;

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

  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'auto' }); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  async function changeLocale(target: ContentLocale) {
    if (target === locale || switchingTo) return;
    localeController.current?.abort();
    const controller = new AbortController(); localeController.current = controller;
    setSwitchingTo(target); setLocaleError(false);
    const result = await switchHomeLocale(home, target, controller.signal);
    if (!controller.signal.aborted) {
      if (result.failed) setLocaleError(true);
      else {
        setHome(result.content); setMenuOpen(false);
        if (!isRouteAvailable(result.content, location.pathname)) navigate('/', { replace: true });
      }
      setSwitchingTo(null);
    }
  }

  const openInquiry = useCallback((trigger: HTMLElement) => { setDialogTrigger(trigger); setDialogOpen(true); }, []);
  const closeInquiry = useCallback(() => setDialogOpen(false), []);
  const runCta = useCallback((cta: ContentCta, trigger: HTMLElement) => {
    const resolution = resolveCta(cta, home, location.pathname);
    if (resolution.kind === 'inquiry') openInquiry(trigger);
    else if (resolution.kind === 'route') navigate(resolution.path);
    else if (resolution.kind === 'anchor') document.getElementById(resolution.id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    else if (resolution.kind === 'external') window.location.assign(resolution.url);
  }, [home, location.pathname, navigate, openInquiry]);

  const hero = blocks.get('hero') as Extract<HomeBlock, { type: 'hero' }> | undefined;
  const about = blocks.get('about') as Extract<HomeBlock, { type: 'about' }> | undefined;
  const capabilities = blocks.get('capabilities') as Extract<HomeBlock, { type: 'capabilities' }> | undefined;
  const motifs = blocks.get('motifs') as Extract<HomeBlock, { type: 'motifs' }> | undefined;
  const jiangnan = blocks.get('jiangnan') as Extract<HomeBlock, { type: 'jiangnan' }> | undefined;
  const partners = blocks.get('partners') as Extract<HomeBlock, { type: 'partners' }> | undefined;
  const contact = blocks.get('contact') as Extract<HomeBlock, { type: 'contact' }> | undefined;
  const homeSummaries = [
    about && { path: '/about', title: pages.find((page) => page.path === '/about')?.label, text: about.paragraphs[0] },
    capabilities && { path: '/capabilities', title: pages.find((page) => page.path === '/capabilities')?.label, text: capabilities.intro },
    jiangnan && { path: '/into-jiangnan', title: pages.find((page) => page.path === '/into-jiangnan')?.label, text: jiangnan.description },
    partners && { path: '/partners', title: pages.find((page) => page.path === '/partners')?.label, text: partners.heading },
    contact && { path: '/contact', title: pages.find((page) => page.path === '/contact')?.label, text: contact.description ?? contact.headingLines.join(' ') },
  ].filter((summary): summary is { path: string; title: string; text: string } => Boolean(summary?.title));

  return <main className="site-shell multipage-shell">
    <a className="skip-link" href="#main-content">{locale === 'en' ? 'Skip to content' : '跳至正文'}</a>
    <header className="site-header route-header">
      <NavLink className="brand-lockup" to="/" aria-label={ui.homeLabel}><span className="brand-mark">{locale === 'en' ? brandEn : brandZh}</span><span className="brand-en">{locale === 'en' ? brandZh : brandEn}</span></NavLink>
      <nav className={`top-nav${menuOpen ? ' is-open' : ''}`} aria-label={ui.navigationLabel}>
        {pages.map((page) => <NavLink key={page.path} to={page.path} end={page.path === '/'} className={({ isActive }) => isActive ? 'is-active' : undefined}>{page.label}</NavLink>)}
        <div className="mobile-language" role="group" aria-label={ui.languageLabel}><button aria-pressed={locale === 'zh-CN'} onClick={() => void changeLocale('zh-CN')}>中文</button><span>/</span><button aria-pressed={locale === 'en'} onClick={() => void changeLocale('en')}>EN</button></div>
      </nav>
      <div className="language-switch" role="group" aria-label={ui.languageLabel}><button aria-pressed={locale === 'zh-CN'} disabled={Boolean(switchingTo)} onClick={() => void changeLocale('zh-CN')}>中</button><span>/</span><button aria-pressed={locale === 'en'} disabled={Boolean(switchingTo)} onClick={() => void changeLocale('en')}>EN</button></div>
      <button className="menu-toggle" aria-label={menuOpen ? ui.menuClose : ui.menuOpen} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><i /><i /></button>
    </header>
    {(switchingTo || localeError) && <div className={`locale-status${localeError ? ' is-error' : ''}`} role="status">{switchingTo ? ui.switching : ui.switchFailed}</div>}

    <Routes>
      <Route path="/" element={<section id="main-content" className="route-page home-page">
        <PageImage path="/" alt={hero?.media.alt ?? ''} eager />
        <div className="route-overlay" /><div className="route-content hero-route-content"><p className="eyebrow">{hero?.eyebrow}</p><h1>{heading(hero?.headingLines ?? [locale === 'en' ? brandEn : brandZh])}</h1><p className="lead">{hero?.description ?? text.brandLine}</p><div className="action-row"><CtaButton cta={hero?.primaryCta} run={runCta} />{hero?.secondaryCta && <CtaButton cta={hero.secondaryCta} run={runCta} className="text-action light" />}</div></div>
        <div className="home-overview" aria-label={text.overview}>{homeSummaries.map((summary) => <NavLink key={summary.path} to={summary.path}><span><strong>{summary.title}</strong><small>{summary.text}</small></span><i>→</i></NavLink>)}</div>
      </section>} />
      <Route path="/about" element={about ? <section id="main-content" className="route-page light-page"><PageImage path="/about" alt="" /><div className="route-overlay" /><article className="route-content"><p className="eyebrow">ABOUT · {about.lead}</p><h1>{heading(about.headingLines)}</h1>{about.paragraphs.map((paragraph) => <p className="body-copy" key={paragraph}>{paragraph}</p>)}{about.statement && <blockquote><strong>{about.statement.value}</strong>{about.statement.text}</blockquote>}</article></section> : <NotFound locale={locale} />} />
      <Route path="/capabilities" element={capabilities || motifs ? <section id="main-content" className="route-page capabilities-page"><PageImage path="/capabilities" alt={motifs?.items[0]?.media.alt ?? ''} /><div className="route-overlay" /><article className="route-content"><p className="eyebrow">{text.capabilities}</p>{capabilities && <><h1>{heading(capabilities.headingLines)}</h1><p className="lead">{capabilities.intro}</p><div className="content-grid">{capabilities.items.map((item) => <section key={item.id}><small>{item.number}</small><h2>{item.title}</h2><p>{item.description}</p></section>)}</div></>}{motifs && <div className="motif-section"><p className="eyebrow">{text.studio}</p><h2>{heading(motifs.headingLines)}</h2><p>{motifs.intro}</p><div className="motif-grid">{motifs.items.map((item) => <article key={item.id}><img src={item.media.url} alt={item.media.alt} loading="lazy" decoding="async" /><h3>{item.title}</h3><small>{item.titleEn} · {item.status}</small><p>{item.description}</p></article>)}</div></div>}</article></section> : <NotFound locale={locale} />} />
      <Route path="/into-jiangnan" element={jiangnan ? <section id="main-content" className="route-page dark-page"><PageImage path="/into-jiangnan" alt={jiangnan.media.alt} /><div className="route-overlay" /><article className="route-content"><p className="eyebrow">INTO JIANGNAN</p><h1>{heading(jiangnan.headingLines)}</h1><p className="lead">{jiangnan.description}</p><CtaButton cta={jiangnan.cta} run={runCta} /></article></section> : <NotFound locale={locale} />} />
      <Route path="/partners" element={partners ? <section id="main-content" className="route-page dark-page"><PageImage path="/partners" alt={partners.items[0]?.media.alt ?? ''} /><div className="route-overlay" /><article className="route-content"><p className="eyebrow">{text.partners}</p><h1>{partners.heading}</h1><div className="partner-grid">{partners.items.map((item) => <article key={item.id}><h2>{item.title}</h2>{item.description && <p>{item.description}</p>}</article>)}</div>{contact && <CtaButton cta={contact.cta} run={runCta} />}</article></section> : <NotFound locale={locale} />} />
      <Route path="/contact" element={contact ? <section id="main-content" className="route-page dark-page contact-page"><PageImage path="/contact" alt="" /><div className="route-overlay" /><article className="route-content"><p className="eyebrow">{contact.kicker}</p><h1>{heading(contact.headingLines)}</h1>{contact.description && <p className="lead">{contact.description}</p>}<CtaButton cta={contact.cta} run={runCta} /><a className="contact-email" href={`mailto:${email}`}>{email}</a></article></section> : <NotFound locale={locale} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

    <footer className="route-footer"><span>{locale === 'en' ? brandEn : brandZh}</span><a href={`mailto:${email}`}>{email}</a><span>{legalName}</span></footer>
    <InquiryDialog locale={locale} email={email} open={dialogOpen} onClose={closeInquiry} returnFocus={dialogTrigger} />
  </main>;
}
