import { FormEvent, useEffect, useState } from 'react';

type Theme = 'nocturne' | 'archive' | 'vermilion';

const themes: { id: Theme; label: string; note: string }[] = [
  { id: 'nocturne', label: '夜石青瓷', note: '夜石 / 宣纸 / 青瓷' },
  { id: 'archive', label: '墨绿文献', note: '墨绿 / 铜灰 / 文献感' },
  { id: 'vermilion', label: '朱砂余光', note: '暖黑 / 朱砂 / 舞台光' },
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

const partners = ['入境旅行社及 DMC', '高端定制机构', '酒店和度假品牌', '银行、企业及会员机构', '目的地与文旅机构', '海外旅行社及文化教育机构'];

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

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('request failed');
      setSubmitted(true);
      form.reset();
    } catch {
      setSubmitError('暂时无法提交，请直接邮件联系 hello@guanzhidongfang.com');
    } finally {
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
          <video className="hero-media" autoPlay muted loop playsInline preload="metadata" poster="/images/Gemini_Generated_Image_stds6ostds6ostds (1).png">
            <source src="/videos/hero-loop.mp4" type="video/mp4" />
          </video>
          <div className="hero-shade" />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-content">
            <p className="eyebrow"><span />东方文化深度体验产品研发与供应机构</p>
            <h1>把东方文化，<br />转化为可以进入的<br /><em>旅行体验。</em></h1>
            <p className="hero-en">Turning Chinese culture into travel experiences people can enter, understand and remember.</p>
            <div className="hero-actions">
              <button className="primary-action" onClick={() => scrollTo('solutions')}>了解核心能力 <i>↗</i></button>
              <button className="text-action" onClick={() => setFormOpen(true)}>发起合作咨询 <i>→</i></button>
            </div>
          </div>
          <div className="hero-index"><span>GZ · DF</span><span>HANGZHOU / 2026</span></div>
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
            {partners.map((partner, index) => <div key={partner}><span>0{index + 1}</span><p>{partner}</p></div>)}
          </div>
        </section>

        <section id="contact" className="contact-section">
          <div className="contact-glow" />
          <p className="contact-kicker">委托研发 · 联合出品 · 内容授权 · 白标产品 · 培训与交付</p>
          <h2>让文化不止被看见，<br />而是真正被进入。</h2>
          <button className="contact-button" onClick={() => setFormOpen(true)}>谈谈您的项目 <span>↗</span></button>
          <div className="contact-meta">
            <p>杭州 · 中国<br /><span>Hangzhou, China</span></p>
            <a href="mailto:hello@guanzhidongfang.com">hello@guanzhidongfang.com</a>
            <p>观止东方文化传播<br /><span>© 2026</span></p>
          </div>
        </section>
      </main>

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <div className="inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setFormOpen(false)} aria-label="关闭合作咨询">×</button>
            {submitted ? (
              <div className="submitted"><span>已记录</span><h2>感谢您的关注。</h2><p>预览版本已完成表单交互。正式上线时将接入企业邮箱与客户线索系统。</p><button onClick={() => { setSubmitted(false); setFormOpen(false); }}>返回网站</button></div>
            ) : (
              <form onSubmit={submitInquiry}>
                <p>PARTNERSHIP INQUIRY</p><h2 id="inquiry-title">谈谈您的项目</h2>
                <label>您的称呼<input name="name" required autoFocus placeholder="姓名 / 机构" /></label>
                <label>联系方式<input name="contact" required placeholder="电话 / 微信 / 邮箱" /></label>
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
