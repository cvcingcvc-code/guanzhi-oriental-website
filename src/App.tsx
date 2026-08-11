import { FormEvent, Fragment, useEffect, useRef, useState } from 'react';
import { FALLBACK_HOME_ZH, FALLBACK_SETTINGS, loadHomeContent, loadSiteSettingsOrFallback, switchHomeLocale, type ContentCta, type ContentLocale } from './content/public-content';
import { UI_TEXT } from './i18n/ui';

type Theme = 'nocturne' | 'archive' | 'vermilion';

const themeIds: Theme[] = ['nocturne', 'archive', 'vermilion'];

const blockAnchors = {
  hero: 'hero',
  about: 'about',
  capabilities: 'solutions',
  motifs: 'studio',
  jiangnan: 'jiangnan',
  partners: 'partners',
  contact: 'contact',
} as const;

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function App() {
  const [theme, setTheme] = useState<Theme>('nocturne');
  const [menuOpen, setMenuOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const localeRequestRef = useRef<AbortController | null>(null);
  const [home, setHome] = useState(FALLBACK_HOME_ZH);
  const [switchingTo, setSwitchingTo] = useState<ContentLocale | null>(null);
  const [localeError, setLocaleError] = useState(false);
  const [siteSettings, setSiteSettings] = useState(FALLBACK_SETTINGS);
  const locale = home.locale;
  const ui = UI_TEXT[locale];
  const hero = home.hero;
  const about = home.about;
  const capabilities = home.capabilities;
  const motifs = home.motifs;
  const jiangnan = home.jiangnan;
  const partners = home.partners;
  const contact = home.contact;
  const visibleAnchors = home.blocks.map((block) => blockAnchors[block.type]);
  const homeAnchor = `#${visibleAnchors[0] ?? 'site-footer'}`;
  const heroIndex = home.blocks.findIndex((block) => block.type === 'hero');
  const heroNextSection = heroIndex >= 0 ? visibleAnchors[heroIndex + 1] : undefined;
  const contactEmail = siteSettings.contact.email ?? FALLBACK_SETTINGS.contact.email!;
  const brandZh = siteSettings.brand.name?.['zh-CN'] ?? FALLBACK_SETTINGS.brand.name!['zh-CN'];
  const brandEn = siteSettings.brand.name?.en ?? FALLBACK_SETTINGS.brand.name!.en!;
  const legalName = locale === 'en'
    ? siteSettings.company.legalName?.en ?? FALLBACK_SETTINGS.company.legalName!.en!
    : siteSettings.company.legalName?.['zh-CN'] ?? FALLBACK_SETTINGS.company.legalName!['zh-CN'];
  const flagshipName = locale === 'en'
    ? siteSettings.flagship.name?.en ?? FALLBACK_SETTINGS.flagship.name!.en!
    : siteSettings.flagship.name?.['zh-CN'] ?? FALLBACK_SETTINGS.flagship.name!['zh-CN'];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 't' && !formOpen) {
        setTheme((current) => themeIds[(themeIds.indexOf(current) + 1) % themeIds.length] ?? 'nocturne');
      }
      if (event.key === 'Escape') {
        setFormOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formOpen]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void loadHomeContent('zh-CN', controller.signal).then((value) => { if (active) setHome(value); }).catch(() => undefined);
    void loadSiteSettingsOrFallback(controller.signal).then((value) => { if (active) setSiteSettings(value); });
    return () => {
      active = false;
      controller.abort();
      localeRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = home.seo.title ?? home.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = home.seo.description ?? '';
  }, [home, locale]);

  const changeLocale = async (target: ContentLocale) => {
    if (target === locale || switchingTo) return;
    localeRequestRef.current?.abort();
    const controller = new AbortController();
    localeRequestRef.current = controller;
    setSwitchingTo(target);
    setLocaleError(false);
    const result = await switchHomeLocale(home, target, controller.signal);
    if (!result.failed) {
      setHome(result.content);
      setMenuOpen(false);
      setSubmitError('');
    } else if (!controller.signal.aborted) {
      setLocaleError(true);
    }
    if (!controller.signal.aborted) setSwitchingTo(null);
  };

  const runCta = (cta: ContentCta) => {
    if (cta.action === 'scroll') scrollTo(cta.target);
    else if (cta.action === 'inquiry') setFormOpen(true);
    else window.location.assign(cta.target);
  };

  const footer = (
    <footer id="site-footer" className={`contact-meta${contact ? '' : ' standalone-footer'}`} aria-label={`${brandZh} ${brandEn}｜${ui.operatedBy}${locale === 'en' ? ': ' : '：'}${legalName}`}>
      <p>{locale === 'en' ? brandEn : brandZh}<br /><span>{locale === 'en' ? brandZh : brandEn}</span></p>
      <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      <p>{ui.operatedBy}{locale === 'en' ? ': ' : '：'}{legalName}<br /><span>© 2026</span></p>
    </footer>
  );

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    const contact = String(formData.get('contact') ?? '').trim();
    const brief = String(formData.get('brief') ?? '').trim();

    if (name.length < 2) {
      setSubmitError(ui.inquiry.nameError);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setSubmitError(ui.inquiry.emailError);
      return;
    }

    if (brief.length < 6) {
      setSubmitError(ui.inquiry.briefError);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    const payload = {
      name,
      organization: name,
      email: contact,
      contact,
      intent: 'other',
      message: brief,
      locale,
      sourceUrl: window.location.href,
      website: '',
    };

    try {
      const response = await fetch('/api/v1/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: { message?: string };
      } | null;

      if (!response.ok || !result?.ok) {
        if (response.status === 400 || response.status === 422) throw new Error(ui.inquiry.validationError);
        if (response.status === 429) throw new Error(ui.inquiry.rateError);
        if (response.status >= 500) throw new Error(ui.inquiry.serverError);
        throw new Error(ui.inquiry.genericError);
      }

      setSubmitted(true);
      form.reset();
    } catch (error) {
      const message = error instanceof Error && !/fetch|network/i.test(error.message)
        ? error.message
        : ui.inquiry.networkError(contactEmail);
      setSubmitError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href={homeAnchor} aria-label={ui.homeLabel}>
          <span className="brand-cn">{brandZh}</span>
          <span className="brand-en">{brandEn}</span>
        </a>
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label={ui.navigationLabel}>
          {about && <a href="#about" onClick={() => setMenuOpen(false)}>{ui.nav.about}</a>}
          {capabilities && <a href="#solutions" onClick={() => setMenuOpen(false)}>{ui.nav.capabilities}</a>}
          {motifs && <a href="#studio" onClick={() => setMenuOpen(false)}>{ui.nav.motifs}</a>}
          {jiangnan && <a href="#jiangnan" onClick={() => setMenuOpen(false)}>{ui.nav.jiangnan}</a>}
          {partners && <a href="#partners" onClick={() => setMenuOpen(false)}>{ui.nav.partners}</a>}
          {contact && <a href="#contact" onClick={() => setMenuOpen(false)}>{ui.nav.contact}</a>}
        </nav>
        <div className="locale-switcher" role="group" aria-label={ui.languageLabel} aria-busy={Boolean(switchingTo)}>
          <button type="button" aria-pressed={locale === 'zh-CN'} disabled={Boolean(switchingTo)} onClick={() => void changeLocale('zh-CN')}>中文</button>
          <span aria-hidden="true">/</span>
          <button type="button" aria-pressed={locale === 'en'} disabled={Boolean(switchingTo)} onClick={() => void changeLocale('en')}>EN</button>
        </div>
        <button className="menu-button" aria-label={menuOpen ? ui.menuClose : ui.menuOpen} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
      </header>

      {(switchingTo || localeError) && (
        <div className={`locale-status${localeError ? ' is-error' : ''}`} role="status">
          {switchingTo ? ui.switching : ui.switchFailed}
        </div>
      )}

      <aside className="theme-switcher" aria-label={ui.themeLabel}>
        <p>{ui.themeLabel.toUpperCase()}</p>
        {themeIds.map((id, index) => (
          <button key={id} className={theme === id ? 'active' : ''} onClick={() => setTheme(id)} aria-pressed={theme === id}>
            <span>0{index + 1}</span><strong>{ui.themes[id].label}</strong><small>{ui.themes[id].note}</small>
          </button>
        ))}
        <div className="theme-tip">{ui.themeTip}</div>
      </aside>

      <main>
        {hero && <section id="hero" className="hero">
          <video key={hero.media.url} className="hero-media" autoPlay muted loop playsInline preload="metadata" poster={hero.media.poster?.url}>
            <source src={hero.media.url} type={hero.media.mimeType ?? 'video/mp4'} />
          </video>
          <div className="hero-shade" />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-content">
            <p className="eyebrow"><span />{hero.eyebrow}</p>
            <h1>{hero.headingLines.map((line, index) => (
              <Fragment key={`${index}-${line}`}>
                {index === hero.emphasisLine ? <em>{line}</em> : line}
                {index < hero.headingLines.length - 1 && <br />}
              </Fragment>
            ))}</h1>
            <p className="hero-en">{hero.description}</p>
            <div className="hero-actions">
              <button className="primary-action" onClick={() => runCta(hero.primaryCta)}>{hero.primaryCta.label} <i>↗</i></button>
              {hero.secondaryCta && <button className="text-action" onClick={() => runCta(hero.secondaryCta!)}>{hero.secondaryCta.label} <i>→</i></button>}
            </div>
          </div>
          <div className="hero-index"><span>{hero.meta?.brandCode ?? brandEn}</span>{hero.meta?.locationAndYear && <span>{hero.meta.locationAndYear}</span>}</div>
          {heroNextSection && <button className="scroll-cue" onClick={() => scrollTo(heroNextSection)} aria-label={ui.scroll}><span>{ui.scroll.toUpperCase()}</span><i>↓</i></button>}
        </section>}

        {about && <section id="about" className="section intro-section">
          <div className="section-mark"><span>01</span><p>{ui.sections.about}</p></div>
          <div className="intro-copy">
            <p className="lead">{about.lead}</p>
            <h2>{about.headingLines.map((line, index) => <Fragment key={line}>{line}{index < about.headingLines.length - 1 && <br />}</Fragment>)}</h2>
            <div className="intro-columns">
              {about.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
          {about.statement && <div className="intro-statement"><strong>{about.statement.value}</strong><span>{about.statement.text.split('\n').map((line, index) => <Fragment key={line}>{line}{index < about.statement!.text.split('\n').length - 1 && <br />}</Fragment>)}</span></div>}
        </section>}

        {capabilities && <section id="solutions" className="section solutions-section">
          <div className="section-heading">
            <div className="section-mark"><span>02</span><p>{ui.sections.capabilities}</p></div>
            <h2>{capabilities.headingLines.map((line, index) => <Fragment key={line}>{line}{index < capabilities.headingLines.length - 1 && <br />}</Fragment>)}</h2>
            <p>{capabilities.intro}</p>
          </div>
          <div className="capability-list">
            {capabilities.items.map((item) => (
              <article key={item.id}>
                <span className="cap-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <i>↗</i>
              </article>
            ))}
          </div>
        </section>}

        {motifs && <section id="studio" className="section studio-section">
          <div className="studio-head">
            <div className="section-mark"><span>03</span><p>{ui.sections.motifs}</p></div>
            <h2>{motifs.headingLines.map((line, index) => <Fragment key={line}>{line}{index < motifs.headingLines.length - 1 && <br />}</Fragment>)}</h2>
            <p>{motifs.intro}</p>
          </div>
          <div className="motif-grid">
            {motifs.items.map((motif, index) => (
              <article className="motif-card" key={motif.id}>
                <img src={motif.media.url} alt={motif.media.alt} width={motif.media.width} height={motif.media.height} loading="lazy" />
                <div className="motif-shade" />
                <span className="motif-index">0{index + 1}</span>
                <span className="motif-status">{motif.status}</span>
                <div className="motif-copy"><p>{motif.titleEn}</p><h3>{motif.title}</h3><span>{motif.description}</span></div>
              </article>
            ))}
          </div>
        </section>}

        {jiangnan && <section id="jiangnan" className="jiangnan-section">
          <img src={jiangnan.media.url} alt={jiangnan.media.alt} width={jiangnan.media.width} height={jiangnan.media.height} loading="lazy" />
          <div className="jiangnan-overlay" />
          <div className="jiangnan-copy">
            <div className="section-mark"><span>04</span><p>{ui.sections.jiangnan}</p></div>
            <p className="vertical-title">{(locale === 'en' ? flagshipName.split(' ') : [...flagshipName]).map((part, index, parts) => <Fragment key={`${index}-${part}`}>{part}{index < parts.length - 1 && <br />}</Fragment>)}</p>
            <div className="jiangnan-main">
              <h2>{jiangnan.headingLines.map((line, index) => <Fragment key={line}>{line}{index < jiangnan.headingLines.length - 1 && <br />}</Fragment>)}</h2>
              <p>{jiangnan.description}</p>
              {jiangnan.cta && <a href={jiangnan.cta.action === 'link' ? jiangnan.cta.target : `#${jiangnan.cta.target}`} onClick={(event) => { if (jiangnan.cta?.action !== 'link') { event.preventDefault(); runCta(jiangnan.cta!); } }}>{jiangnan.cta.label} <span>↗</span></a>}
            </div>
          </div>
        </section>}

        {partners && <section id="partners" className="section proof-section">
          <div className="section-mark"><span>05</span><p>{ui.sections.partners}</p></div>
          <h2>{partners.heading}</h2>
          <div className="partner-grid">
            {partners.items.map((partner, index) => (
              <article className="partner-card" key={partner.id}>
                <img src={partner.media.url} alt={partner.media.alt} width={partner.media.width} height={partner.media.height} loading="lazy" />
                <div className="partner-shade" />
                <span>0{index + 1}</span>
                <p>{partner.title}</p>
                {partner.description && <small>{partner.description}</small>}
              </article>
            ))}
          </div>
        </section>}

        {contact && <section id="contact" className="contact-section">
          <div className="contact-glow" />
          <p className="contact-kicker">{contact.kicker}</p>
          <h2>{contact.headingLines.map((line, index) => <Fragment key={line}>{line}{index < contact.headingLines.length - 1 && <br />}</Fragment>)}</h2>
          {contact.description && <p className="contact-description">{contact.description}</p>}
          <button className="contact-button" onClick={() => runCta(contact.cta)}>{contact.cta.label} <span>↗</span></button>
          {footer}
        </section>}
      </main>

      {!contact && footer}

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <div className="inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setFormOpen(false)} aria-label={ui.inquiry.close}>×</button>
            {submitted ? (
              <div className="submitted"><span>{ui.inquiry.successLabel}</span><h2>{ui.inquiry.successTitle}</h2><p>{ui.inquiry.successBody}</p><button onClick={() => { setSubmitted(false); setFormOpen(false); }}>{ui.inquiry.back}</button></div>
            ) : (
              <form onSubmit={submitInquiry} noValidate>
                <p>{ui.inquiry.kicker}</p><h2 id="inquiry-title">{ui.inquiry.title}</h2>
                <label>{ui.inquiry.name}<input name="name" required autoFocus placeholder={ui.inquiry.namePlaceholder} /></label>
                <label>{ui.inquiry.email}<input name="contact" type="email" required autoComplete="email" placeholder={ui.inquiry.emailPlaceholder} /></label>
                <label>{ui.inquiry.brief}<textarea name="brief" required rows={4} placeholder={ui.inquiry.briefPlaceholder} /></label>
                {submitError && <div className="form-error" role="alert">{submitError}</div>}
                <button type="submit" disabled={submitting}>{submitting ? ui.inquiry.submitting : ui.inquiry.submit} <span>→</span></button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
