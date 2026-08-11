import { FormEvent, Fragment, useEffect, useRef, useState } from 'react';
import { FALLBACK_HERO, FALLBACK_SETTINGS, loadHeroOrFallback, loadSiteSettingsOrFallback, type ContentCta } from './content/public-content';

type Theme = 'nocturne' | 'archive' | 'vermilion';

const themes: { id: Theme; label: string; note: string }[] = [
  { id: 'nocturne', label: '宣纸编辑', note: '米白 / 墨绿 / 朱砂' },
  { id: 'archive', label: '青瓷研究', note: '灰绿 / 青瓷 / 文献感' },
  { id: 'vermilion', label: '暖砂策展', note: '暖砂 / 棕墨 / 朱砂' },
];

const capabilities = [
  ['01', '文化产品研发', '从文化母题、叙事系统到体验流程，形成可被理解、参与与记住的完整产品。'],
  ['02', '标准体验模块', '提供 90 分钟、半日、一日与多日主题模块，适配不同渠道、场景与客群。'],
  ['03', '国际化文化转译', '以多语言内容、认知入口与讲解体系，降低跨文化理解门槛。'],
  ['04', '交付与培训', '通过产品手册、人员培训、交付 SOP 与质量评估，让体验稳定落地。'],
];

const motifs = [
  { title: '园林', en: 'GARDEN', text: '如何走进一首中国式的诗', image: '/images/Gemini_Generated_Image_stds6ostds6ostds (1).png', status: '合作开发中' },
  { title: '藏书楼', en: 'LIBRARY', text: '文人如何保存知识与精神世界', image: '/images/Gemini_Generated_Image_stds6ostds6ostds (4).png', status: '重点研发方向' },
  { title: '茶与丝绸', en: 'TEA & SILK', text: '江南日常生活中的时间和手艺', image: '/images/Gemini_Generated_Image_stds6ostds6ostds (5).png', status: '合作开发中' },
  { title: '昆曲', en: 'KUNQU', text: '如何听懂中国古典戏剧的一段声音', image: '/images/Gemini_Generated_Image_stds6ostds6ostds (6).png', status: '重点研发方向' },
];

const partners = [
  { title: '入境旅行社及 DMC', image: '/images/partners/partner-01.png', alt: '旅行策划团队围绕地图共同研究江南文化路线' },
  { title: '高端定制机构', image: '/images/partners/partner-02.png', alt: '文化主理人在江南园林中准备高端定制体验' },
  { title: '酒店和度假品牌', image: '/images/partners/partner-03.png', alt: '酒店庭院中的东方文化欢迎体验场景' },
  { title: '银行、企业及会员机构', image: '/images/partners/partner-04.png', alt: '会员客户参加小型东方文化艺术沙龙' },
  { title: '目的地与文旅机构', image: '/images/partners/partner-05.png', alt: '文旅团队围绕建筑模型规划目的地文化产品' },
  { title: '海外旅行社及文化教育机构', image: '/images/partners/partner-06.png', alt: '国际访客在中式藏书空间参加文化工作坊' },
];

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
  const [hero, setHero] = useState(FALLBACK_HERO);
  const [siteSettings, setSiteSettings] = useState(FALLBACK_SETTINGS);
  const contactEmail = siteSettings.contact.email ?? FALLBACK_SETTINGS.contact.email!;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 't' && !formOpen) {
        setTheme((current) => themes[(themes.findIndex((item) => item.id === current) + 1) % themes.length].id);
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
    void loadHeroOrFallback(controller.signal).then((value) => { if (active) setHero(value); });
    void loadSiteSettingsOrFallback(controller.signal).then((value) => { if (active) setSiteSettings(value); });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const runCta = (cta: ContentCta) => {
    if (cta.action === 'scroll') scrollTo(cta.target);
    else if (cta.action === 'inquiry') setFormOpen(true);
    else window.location.assign(cta.target);
  };

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    const contact = String(formData.get('contact') ?? '').trim();
    const brief = String(formData.get('brief') ?? '').trim();

    if (name.length < 2) {
      setSubmitError('请填写至少 2 个字符的姓名或机构名称。');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setSubmitError('请填写有效的联系邮箱。');
      return;
    }

    if (brief.length < 6) {
      setSubmitError('请至少用 6 个字符简要说明合作需求。');
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
      locale: 'zh-CN',
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
        if (response.status === 422) throw new Error('提交内容未通过校验，请检查姓名、邮箱和合作需求。');
        if (response.status === 429) throw new Error('提交过于频繁，请稍后再试。');
        if (response.status >= 500) throw new Error('服务暂时不可用，请稍后重试。');
        throw new Error(result?.error?.message || '提交失败，请检查填写内容。');
      }

      setSubmitted(true);
      form.reset();
    } catch (error) {
      const message = error instanceof Error && !/fetch|network/i.test(error.message)
        ? error.message
        : `网络连接失败，请稍后重试或直接邮件联系 ${contactEmail}。`;
      setSubmitError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#hero" aria-label="观止东方首页">
          <span className="brand-cn">观止东方</span>
          <span className="brand-en">GUANZHI DONGFANG</span>
        </a>
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="主要导航">
          <a href="#about" onClick={() => setMenuOpen(false)}>关于</a>
          <a href="#solutions" onClick={() => setMenuOpen(false)}>解决方案</a>
          <a href="#studio" onClick={() => setMenuOpen(false)}>产品实验室</a>
          <a href="#jiangnan" onClick={() => setMenuOpen(false)}>入江南</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>合作</a>
        </nav>
        <button className="menu-button" aria-label="打开或关闭菜单" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
      </header>

      <aside className="theme-switcher" aria-label="预览风格切换">
        <p>PREVIEW STYLE</p>
        {themes.map((item, index) => (
          <button key={item.id} className={theme === item.id ? 'active' : ''} onClick={() => setTheme(item.id)} aria-pressed={theme === item.id}>
            <span>0{index + 1}</span><strong>{item.label}</strong><small>{item.note}</small>
          </button>
        ))}
        <div className="theme-tip">按 T 快速切换</div>
      </aside>

      <main>
        <section id="hero" className="hero">
          <video className="hero-media" autoPlay muted loop playsInline preload="metadata" poster={hero.media.poster?.url}>
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
          <div className="hero-index"><span>{hero.meta?.brandCode ?? 'GZ · DF'}</span><span>{hero.meta?.locationAndYear ?? 'HANGZHOU / 2026'}</span></div>
          <button className="scroll-cue" onClick={() => scrollTo('about')} aria-label="滚动至下一部分"><span>SCROLL TO EXPLORE</span><i>↓</i></button>
        </section>

        <section id="about" className="section intro-section">
          <div className="section-mark"><span>01</span><p>ABOUT / 定位</p></div>
          <div className="intro-copy">
            <p className="lead">我们不是传统旅行社。</p>
            <h2>我们研发文化体验，<br />也让它被稳定交付。</h2>
            <div className="intro-columns">
              <p>观止东方从文化研究出发，将园林、藏书、茶与丝绸、昆曲、运河等东方文化母题，转化为结构清晰、可感知、可交付的体验产品。</p>
              <p>为旅行社、酒店、会员机构与目的地提供产品研发、内容授权、联合出品与交付支持。让合作方从一个好想法，走到一次真实发生的体验。</p>
            </div>
          </div>
          <div className="intro-statement"><strong>10″</strong><span>让行业客户在十秒内看懂<br />我们是谁、解决什么问题</span></div>
        </section>

        <section id="solutions" className="section solutions-section">
          <div className="section-heading">
            <div className="section-mark"><span>02</span><p>SOLUTIONS / 核心能力</p></div>
            <h2>从文化母题<br />到可交付产品</h2>
            <p>研究不是终点。我们把内容、流程、人员与标准组织成可复用的产品系统。</p>
          </div>
          <div className="capability-list">
            {capabilities.map(([number, title, description]) => (
              <article key={number}>
                <span className="cap-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <i>↗</i>
              </article>
            ))}
          </div>
        </section>

        <section id="studio" className="section studio-section">
          <div className="studio-head">
            <div className="section-mark"><span>03</span><p>PRODUCT STUDIO / 产品实验室</p></div>
            <h2>正在生长的<br />文化体验母题</h2>
            <p>不虚构成熟案例。以下方向正在研究、验证与联合开发中。</p>
          </div>
          <div className="motif-grid">
            {motifs.map((motif, index) => (
              <article className="motif-card" key={motif.title}>
                <img src={motif.image} alt={`${motif.title}文化体验研发方向`} loading="lazy" />
                <div className="motif-shade" />
                <span className="motif-index">0{index + 1}</span>
                <span className="motif-status">{motif.status}</span>
                <div className="motif-copy"><p>{motif.en}</p><h3>{motif.title}</h3><span>{motif.text}</span></div>
              </article>
            ))}
          </div>
        </section>

        <section id="jiangnan" className="jiangnan-section">
          <img src="/images/Gemini_Generated_Image_stds6ostds6ostds (7).png" alt="雾色江南水乡与舟船" loading="lazy" />
          <div className="jiangnan-overlay" />
          <div className="jiangnan-copy">
            <div className="section-mark"><span>04</span><p>ENTERING JIANGNAN / 入江南</p></div>
            <p className="vertical-title">入<br />江<br />南</p>
            <div className="jiangnan-main">
              <h2>不是一条景点线路，<br />而是一套进入中国审美<br />与生活方式的文化体验。</h2>
              <p>从园林、藏书、昆曲、饮食与日常生活进入江南。为海外游客与国内高知客群建立一条理解中国文化的安静入口。</p>
              <a href="#contact">共同研发「入江南」 <span>↗</span></a>
            </div>
          </div>
        </section>

        <section className="section proof-section">
          <div className="section-mark"><span>05</span><p>FOR PARTNERS / 合作对象</p></div>
          <h2>为需要文化深度与稳定交付的机构服务</h2>
          <div className="partner-grid">
            {partners.map((partner, index) => (
              <article className="partner-card" key={partner.title}>
                <img src={partner.image} alt={partner.alt} loading="lazy" />
                <div className="partner-shade" />
                <span>0{index + 1}</span>
                <p>{partner.title}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="contact-section">
          <div className="contact-glow" />
          <p className="contact-kicker">委托研发 · 联合出品 · 内容授权 · 白标产品 · 培训与交付</p>
          <h2>让文化不止被看见，<br />而是真正被进入。</h2>
          <button className="contact-button" onClick={() => setFormOpen(true)}>谈谈您的项目 <span>↗</span></button>
          <div className="contact-meta">
            <p>杭州 · 中国<br /><span>Hangzhou, China</span></p>
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            <p>观止东方文化传播<br /><span>© 2026</span></p>
          </div>
        </section>
      </main>

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <div className="inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setFormOpen(false)} aria-label="关闭合作咨询">×</button>
            {submitted ? (
              <div className="submitted"><span>提交成功</span><h2>感谢您的关注。</h2><p>合作咨询已成功提交，我们会尽快与您联系。</p><button onClick={() => { setSubmitted(false); setFormOpen(false); }}>返回网站</button></div>
            ) : (
              <form onSubmit={submitInquiry} noValidate>
                <p>PARTNERSHIP INQUIRY</p><h2 id="inquiry-title">谈谈您的项目</h2>
                <label>您的称呼<input name="name" required autoFocus placeholder="姓名 / 机构" /></label>
                <label>联系邮箱<input name="contact" type="email" required autoComplete="email" placeholder="name@example.com" /></label>
                <label>合作需求<textarea name="brief" required rows={4} placeholder="项目背景、目标客群与大致时间" /></label>
                {submitError && <div className="form-error" role="alert">{submitError}</div>}
                <button type="submit" disabled={submitting}>{submitting ? '正在提交…' : '提交合作意向'} <span>→</span></button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
