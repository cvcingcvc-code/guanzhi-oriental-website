import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
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
import './interaction-enhancements.css';

// ─── 页面背景图映射 ───────────────────────────────────────────────────────────
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
    brandLine: '让人进入、理解，并记住东方文化。',
    overview: '探索观止东方',
    readMore: '了解更多',
    notFound: '此页面暂无已发布内容。',
    backHome: '返回首页',
    capabilities: '研发能力',
    studio: '产品实验室',
    partners: '合作对象',
    contact: '开始合作',
    menu: '网站菜单',
  },
  en: {
    brandLine: 'Experiences that let people enter, understand and remember Chinese culture.',
    overview: 'Explore Guanzhi Oriental',
    readMore: 'Learn more',
    notFound: 'No published content is available for this page.',
    backHome: 'Back to home',
    capabilities: 'Capabilities',
    studio: 'Product Studio',
    partners: 'Partners',
    contact: 'Start a conversation',
    menu: 'Site menu',
  },
} as const;

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function heading(lines: string[]) {
  return lines.map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 && <br />}
    </Fragment>
  ));
}

// ─── 图片组件（含加载淡入） ───────────────────────────────────────────────────
function PageImage({
  path,
  alt,
  eager = false,
}: {
  path: keyof typeof pageImages;
  alt: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  // W-2: 路由切换时重置加载状态，防止旧图闪烁
  useEffect(() => {
    setLoaded(false);
  }, [path]);

  return (
    <div className="page-visual">
      <img
        src={pageImages[path]}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.9s cubic-bezier(0.22, 0.8, 0.2, 1)',
        }}
      />
    </div>
  );
}

// ─── CTA 按钮（带点击波纹） ───────────────────────────────────────────────────
function CtaButton({
  cta,
  run,
  className = 'primary-action',
}: {
  cta?: ContentCta;
  run: (cta: ContentCta, trigger: HTMLElement) => void;
  className?: string;
}) {
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  // W-1: 用 ref 追踪 timer，卸载时清除防止内存泄漏
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (rippleTimer.current !== null) clearTimeout(rippleTimer.current);
    };
  }, []);

  if (!cta) return null;

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipple({ x: event.clientX - rect.left, y: event.clientY - rect.top, id });
    if (rippleTimer.current !== null) clearTimeout(rippleTimer.current);
    rippleTimer.current = setTimeout(() => setRipple(null), 600);
    run(cta!, event.currentTarget);
  }

  return (
    <button className={`${className} cta-btn`} onClick={handleClick}>
      {cta.label}
      <span className="cta-arrow">↗</span>
      {ripple && (
        <span
          className="cta-ripple"
          style={{ left: ripple.x, top: ripple.y }}
          key={ripple.id}
        />
      )}
    </button>
  );
}

// ─── 路由页面过渡包装器 ───────────────────────────────────────────────────────
function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 下一帧触发 — 确保 CSS transition 生效
    const id = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(id);
      setVisible(false);
    };
  }, [pageKey]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.55s cubic-bezier(0.22, 0.8, 0.2, 1), transform 0.55s cubic-bezier(0.22, 0.8, 0.2, 1)',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

// ─── 404 页 ───────────────────────────────────────────────────────────────────
function NotFound({ locale }: { locale: ContentLocale }) {
  const text = uiCopy[locale];
  return (
    <section id="main-content" className="route-page empty-page">
      <p className="eyebrow">404</p>
      <h1>{text.notFound}</h1>
      <NavLink className="primary-action" to="/">
        {text.backHome}
        <span>→</span>
      </NavLink>
    </section>
  );
}

// ─── 主应用 ───────────────────────────────────────────────────────────────────
export default function App() {
  const [home, setHome] = useState<HomeContent>(FALLBACK_HOME_ZH);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTrigger, setDialogTrigger] = useState<HTMLElement | null>(null);
  const [switchingTo, setSwitchingTo] = useState<ContentLocale | null>(null);
  const [localeError, setLocaleError] = useState(false);
  // 导航栏滚动感知
  const [scrolled, setScrolled] = useState(false);
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
  const legalName =
    locale === 'en'
      ? settings.company.legalName?.en ?? FALLBACK_SETTINGS.company.legalName!.en!
      : settings.company.legalName?.['zh-CN'] ?? FALLBACK_SETTINGS.company.legalName!['zh-CN'];
  const email = settings.contact.email ?? FALLBACK_SETTINGS.contact.email!;

  // ── 初始数据加载 ────────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    void loadHomeContent('zh-CN', controller.signal).then(setHome).catch(() => undefined);
    void loadSiteSettingsOrFallback(controller.signal).then(setSettings);
    return () => { controller.abort(); localeController.current?.abort(); };
  }, []);

  // ── SEO meta 同步 ───────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = home.seo.title ?? home.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = home.seo.description ?? '';
  }, [home, locale]);

  // ── 路由切换时关菜单 + 回顶 ────────────────────────────────────────────────
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  // ── Escape 关菜单 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  // ── 滚动感知 header ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── 语言切换 ────────────────────────────────────────────────────────────────
  // W-3: 用 useCallback 包裹避免每次渲染产生新引用
  const changeLocale = useCallback(async (target: ContentLocale) => {
    if (target === locale || switchingTo) return;
    localeController.current?.abort();
    const controller = new AbortController();
    localeController.current = controller;
    setSwitchingTo(target);
    setLocaleError(false);
    const result = await switchHomeLocale(home, target, controller.signal);
    if (!controller.signal.aborted) {
      if (result.failed) setLocaleError(true);
      else {
        setHome(result.content);
        setMenuOpen(false);
        if (!isRouteAvailable(result.content, location.pathname)) navigate('/', { replace: true });
      }
      setSwitchingTo(null);
    }
  }, [locale, switchingTo, home, location.pathname, navigate]);

  // ── 询盘弹窗控制 ────────────────────────────────────────────────────────────
  const openInquiry = useCallback((trigger: HTMLElement) => {
    setDialogTrigger(trigger);
    setDialogOpen(true);
  }, []);
  const closeInquiry = useCallback(() => setDialogOpen(false), []);

  // ── CTA 分发 ─────────────────────────────────────────────────────────────────
  const runCta = useCallback(
    (cta: ContentCta, trigger: HTMLElement) => {
      const resolution = resolveCta(cta, home, location.pathname);
      if (resolution.kind === 'inquiry') openInquiry(trigger);
      else if (resolution.kind === 'route') navigate(resolution.path);
      else if (resolution.kind === 'anchor')
        document
          .getElementById(resolution.id)
          ?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
          });
      else if (resolution.kind === 'external') window.location.assign(resolution.url);
    },
    [home, location.pathname, navigate, openInquiry],
  );

  // ── 解构区块 ─────────────────────────────────────────────────────────────────
  const hero = blocks.get('hero') as Extract<HomeBlock, { type: 'hero' }> | undefined;
  const about = blocks.get('about') as Extract<HomeBlock, { type: 'about' }> | undefined;
  const capabilities = blocks.get('capabilities') as Extract<HomeBlock, { type: 'capabilities' }> | undefined;
  const motifs = blocks.get('motifs') as Extract<HomeBlock, { type: 'motifs' }> | undefined;
  const jiangnan = blocks.get('jiangnan') as Extract<HomeBlock, { type: 'jiangnan' }> | undefined;
  const partners = blocks.get('partners') as Extract<HomeBlock, { type: 'partners' }> | undefined;
  const contact = blocks.get('contact') as Extract<HomeBlock, { type: 'contact' }> | undefined;

  const homeSummaries = [
    about && { path: '/about', title: pages.find((p) => p.path === '/about')?.label, text: about.paragraphs[0] },
    capabilities && { path: '/capabilities', title: pages.find((p) => p.path === '/capabilities')?.label, text: capabilities.intro },
    jiangnan && { path: '/into-jiangnan', title: pages.find((p) => p.path === '/into-jiangnan')?.label, text: jiangnan.description },
    partners && { path: '/partners', title: pages.find((p) => p.path === '/partners')?.label, text: partners.heading },
    contact && { path: '/contact', title: pages.find((p) => p.path === '/contact')?.label, text: contact.description ?? contact.headingLines.join(' ') },
  ].filter((s): s is { path: string; title: string; text: string } => Boolean(s?.title));

  return (
    <main className="site-shell multipage-shell">
      {/* 无障碍跳转 */}
      <a className="skip-link" href="#main-content">
        {locale === 'en' ? 'Skip to content' : '跳至正文'}
      </a>

      {/* ── 导航栏（滚动感知 + 毛玻璃） ─────────────────────────────────────── */}
      <header
        className={`site-header route-header${scrolled ? ' is-scrolled' : ''}`}
        style={{
          background: scrolled
            ? 'linear-gradient(#071013f2, #071013e8)'
            : 'linear-gradient(#071013d9, #07101300)',
          backdropFilter: scrolled ? 'blur(14px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
          transition: 'background 0.5s, backdrop-filter 0.5s',
        }}
      >
        <NavLink className="brand-lockup" to="/" aria-label={ui.homeLabel}>
          <span className="brand-mark">{locale === 'en' ? brandEn : brandZh}</span>
          <span className="brand-en">{locale === 'en' ? brandZh : brandEn}</span>
        </NavLink>

        <nav className={`top-nav${menuOpen ? ' is-open' : ''}`} aria-label={ui.navigationLabel}>
          {pages.map((page) => (
            <NavLink
              key={page.path}
              to={page.path}
              end={page.path === '/'}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {page.label}
            </NavLink>
          ))}
          {/* 移动端语言切换 */}
          <div className="mobile-language" role="group" aria-label={ui.languageLabel}>
            <button aria-pressed={locale === 'zh-CN'} onClick={() => void changeLocale('zh-CN')}>
              中文
            </button>
            <span>/</span>
            <button aria-pressed={locale === 'en'} onClick={() => void changeLocale('en')}>
              EN
            </button>
          </div>
        </nav>

        {/* 桌面端语言切换（带 loading spinner） */}
        <div className="language-switch" role="group" aria-label={ui.languageLabel}>
          <button
            aria-pressed={locale === 'zh-CN'}
            disabled={Boolean(switchingTo)}
            onClick={() => void changeLocale('zh-CN')}
            className={switchingTo === 'zh-CN' ? 'lang-loading' : ''}
          >
            中
          </button>
          <span>/</span>
          <button
            aria-pressed={locale === 'en'}
            disabled={Boolean(switchingTo)}
            onClick={() => void changeLocale('en')}
            className={switchingTo === 'en' ? 'lang-loading' : ''}
          >
            EN
          </button>
        </div>

        {/* 移动端汉堡菜单（三段动画） */}
        <button
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          aria-label={menuOpen ? ui.menuClose : ui.menuOpen}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <i />
          <i />
        </button>
      </header>

      {/* 语言切换状态提示 */}
      {(switchingTo || localeError) && (
        <div className={`locale-status${localeError ? ' is-error' : ''}`} role="status">
          {switchingTo ? ui.switching : ui.switchFailed}
        </div>
      )}

      {/* ── 路由内容（带页面过渡） ───────────────────────────────────────────── */}
      <Routes>
        {/* 首页 */}
        <Route
          path="/"
          element={
            <PageTransition pageKey="home">
              <section id="main-content" className="route-page home-page">
                <PageImage path="/" alt={hero?.media?.alt ?? ''} eager />
                <div className="route-overlay" />
                <div className="route-content hero-route-content">
                  <p className="eyebrow">{hero?.eyebrow}</p>
                  <h1>{heading(hero?.headingLines ?? [locale === 'en' ? brandEn : brandZh])}</h1>
                  <p className="lead">{hero?.description ?? text.brandLine}</p>
                  <div className="action-row">
                    <CtaButton cta={hero?.primaryCta} run={runCta} />
                    {hero?.secondaryCta && (
                      <CtaButton cta={hero.secondaryCta} run={runCta} className="text-action light" />
                    )}
                  </div>
                </div>
                {/* 首页概览卡 */}
                <nav className="home-overview" aria-label={text.overview}>
                  {homeSummaries.map((summary) => (
                    <NavLink key={summary.path} to={summary.path} className="overview-item">
                      <span>
                        <strong>{summary.title}</strong>
                        <small>{summary.text}</small>
                      </span>
                      <i className="overview-arrow">→</i>
                    </NavLink>
                  ))}
                </nav>
              </section>
            </PageTransition>
          }
        />

        {/* 关于 */}
        <Route
          path="/about"
          element={
            about ? (
              <PageTransition pageKey="about">
                <section id="main-content" className="route-page light-page">
                  <PageImage path="/about" alt="" />
                  <div className="route-overlay" />
                  <article className="route-content">
                    <p className="eyebrow">ABOUT · {about.lead}</p>
                    <h1>{heading(about.headingLines)}</h1>
                    {about.paragraphs.map((paragraph) => (
                      <p className="body-copy" key={paragraph}>{paragraph}</p>
                    ))}
                    {about.statement && (
                      <blockquote>
                        <strong>{about.statement.value}</strong>
                        {about.statement.text}
                      </blockquote>
                    )}
                  </article>
                </section>
              </PageTransition>
            ) : (
              <NotFound locale={locale} />
            )
          }
        />

        {/* 能力 */}
        <Route
          path="/capabilities"
          element={
            capabilities || motifs ? (
              <PageTransition pageKey="capabilities">
                <section id="main-content" className="route-page capabilities-page">
                  <PageImage path="/capabilities" alt={motifs?.items[0]?.media?.alt ?? ''} />
                  <div className="route-overlay" />
                  <article className="route-content">
                    <p className="eyebrow">{text.capabilities}</p>
                    {capabilities && (
                      <>
                        <h1>{heading(capabilities.headingLines)}</h1>
                        <p className="lead">{capabilities.intro}</p>
                        <div className="content-grid">
                          {capabilities.items.map((item) => (
                            <section key={item.id}>
                              <small>{item.number}</small>
                              <h2>{item.title}</h2>
                              <p>{item.description}</p>
                            </section>
                          ))}
                        </div>
                      </>
                    )}
                    {motifs && (
                      <div className="motif-section">
                        <p className="eyebrow">{text.studio}</p>
                        <h2>{heading(motifs.headingLines)}</h2>
                        <p>{motifs.intro}</p>
                        <div className="motif-grid">
                          {motifs.items.map((item) => (
                            <article key={item.id} className="motif-card">
                              <div className="motif-img-wrap">
                                <img
                                  src={item.media.url}
                                  alt={item.media.alt}
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                              <h3>{item.title}</h3>
                              <small>{item.titleEn} · {item.status}</small>
                              <p>{item.description}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                </section>
              </PageTransition>
            ) : (
              <NotFound locale={locale} />
            )
          }
        />

        {/* 入江南 */}
        <Route
          path="/into-jiangnan"
          element={
            jiangnan ? (
              <PageTransition pageKey="jiangnan">
                <section id="main-content" className="route-page dark-page">
                  <PageImage path="/into-jiangnan" alt={jiangnan.media.alt} />
                  <div className="route-overlay" />
                  <article className="route-content">
                    <p className="eyebrow">INTO JIANGNAN</p>
                    <h1>{heading(jiangnan.headingLines)}</h1>
                    <p className="lead">{jiangnan.description}</p>
                    <CtaButton cta={jiangnan.cta} run={runCta} />
                  </article>
                </section>
              </PageTransition>
            ) : (
              <NotFound locale={locale} />
            )
          }
        />

        {/* 伙伴 */}
        <Route
          path="/partners"
          element={
            partners ? (
              <PageTransition pageKey="partners">
                <section id="main-content" className="route-page dark-page">
                  <PageImage path="/partners" alt={partners.items[0]?.media?.alt ?? ''} />
                  <div className="route-overlay" />
                  <article className="route-content">
                    <p className="eyebrow">{text.partners}</p>
                    <h1>{partners.heading}</h1>
                    <div className="partner-grid">
                      {partners.items.map((item) => (
                        <article key={item.id}>
                          <h2>{item.title}</h2>
                          {item.description && <p>{item.description}</p>}
                        </article>
                      ))}
                    </div>
                    {contact && <CtaButton cta={contact.cta} run={runCta} />}
                  </article>
                </section>
              </PageTransition>
            ) : (
              <NotFound locale={locale} />
            )
          }
        />

        {/* 联系 */}
        <Route
          path="/contact"
          element={
            contact ? (
              <PageTransition pageKey="contact">
                <section id="main-content" className="route-page dark-page contact-page">
                  <PageImage path="/contact" alt="" />
                  <div className="route-overlay" />
                  <article className="route-content">
                    <p className="eyebrow">{contact.kicker}</p>
                    <h1>{heading(contact.headingLines)}</h1>
                    {contact.description && <p className="lead">{contact.description}</p>}
                    <CtaButton cta={contact.cta} run={runCta} />
                    <a className="contact-email" href={`mailto:${email}`}>{email}</a>
                  </article>
                </section>
              </PageTransition>
            ) : (
              <NotFound locale={locale} />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* 页脚 */}
      <footer className="route-footer">
        <span>{locale === 'en' ? brandEn : brandZh}</span>
        <a href={`mailto:${email}`}>{email}</a>
        <span>{legalName}</span>
      </footer>

      {/* 询盘弹窗 */}
      <InquiryDialog
        locale={locale}
        email={email}
        open={dialogOpen}
        onClose={closeInquiry}
        returnFocus={dialogTrigger}
      />
    </main>
  );
}
