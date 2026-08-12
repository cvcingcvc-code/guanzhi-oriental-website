import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminApiError, loadHomepage, loadMedia, publishHomepage, saveHomepageDraft, uploadMedia } from './api';
import { BlockEditor } from './BlockEditor';
import type { AdminHomepageData, AdminMediaAsset, AdminUser, ContentLocale, HomeBlock, HomepageTranslation } from './types';
import { BLOCK_LABELS, HOME_BLOCK_ORDER } from './types';

function cloneTranslations(translations: HomepageTranslation[]) {
  return structuredClone(translations);
}

function errorMessage(error: unknown) {
  if (error instanceof AdminApiError && Array.isArray(error.details)) {
    const issues = error.details
      .slice(0, 5)
      .map((issue) => {
        if (!issue || typeof issue !== 'object') return '';
        const candidate = issue as { path?: Array<string | number>; message?: string };
        return `${candidate.path?.join('.') || '内容'}：${candidate.message || '校验失败'}`;
      })
      .filter(Boolean);
    if (issues.length) return `${error.message}：${issues.join('；')}`;
  }
  return error instanceof Error ? error.message : '发生未知错误。';
}

function validateTranslations(translations: HomepageTranslation[]) {
  const errors: string[] = [];
  const validateMedia = (prefix: string, media: { assetId?: string; fallbackUrl?: string; alt: { 'zh-CN': string }; poster?: typeof media }) => {
    if (!media.assetId && !media.fallbackUrl) errors.push(`${prefix} 尚未选择媒体。`);
    if (media.fallbackUrl && !/^\/(?!\/)/.test(media.fallbackUrl)) errors.push(`${prefix} 的 fallback URL 必须以单个 / 开头。`);
    if (!media.alt['zh-CN'].trim()) errors.push(`${prefix} 缺少中文替代文本。`);
    if (media.poster) validateMedia(`${prefix} Poster`, media.poster);
  };
  for (const locale of ['zh-CN', 'en'] as const) {
    const translation = translations.find((item) => item.locale === locale);
    if (!translation) {
      errors.push(`缺少 ${locale} 内容。`);
      continue;
    }
    if (!translation.title.trim()) errors.push(`${locale} 页面标题不能为空。`);
    const types = translation.blocks.blocks.map((block) => block.type);
    if (types.length !== 7 || types.some((type, index) => type !== HOME_BLOCK_ORDER[index])) errors.push(`${locale} 必须保持固定七区块顺序。`);
    if (!translation.blocks.blocks.some((block) => block.enabled)) errors.push(`${locale} 至少启用一个区块。`);
    for (const block of translation.blocks.blocks) {
      const prefix = `${locale} / ${BLOCK_LABELS[block.type]}`;
      if ('headingLines' in block && block.headingLines.some((line) => !line.trim())) errors.push(`${prefix} 存在空标题行。`);
      if (block.type === 'about' && block.paragraphs.some((paragraph) => !paragraph.trim())) errors.push(`${prefix} 存在空正文段落。`);
      if ('items' in block && block.items.length < 1) errors.push(`${prefix} 至少保留一个列表项。`);
      if ('items' in block && block.items.some((item) => !item.id || !/^[a-z0-9-]+$/.test(item.id))) errors.push(`${prefix} 存在无效项目 ID。`);
      if (block.type === 'hero' || block.type === 'jiangnan') validateMedia(`${prefix} 媒体`, block.media);
      if (block.type === 'motifs' || block.type === 'partners') block.items.forEach((item, index) => validateMedia(`${prefix} 第 ${index + 1} 项媒体`, item.media));
    }
  }
  return [...new Set(errors)];
}

export function HomepageEditor({ token, user, onLogout }: {
  token: string;
  user: AdminUser;
  onLogout: () => void;
}) {
  const [serverData, setServerData] = useState<AdminHomepageData | null>(null);
  const [translations, setTranslations] = useState<HomepageTranslation[]>([]);
  const [locale, setLocale] = useState<ContentLocale>('zh-CN');
  const [activeBlock, setActiveBlock] = useState<HomeBlock['type']>('hero');
  const [assets, setAssets] = useState<AdminMediaAsset[]>([]);
  const [mediaError, setMediaError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const editSequence = useRef(0);

  const handleApiError = (caught: unknown) => {
    if (caught instanceof AdminApiError && caught.status === 401) {
      onLogout();
      return;
    }
    if (caught instanceof AdminApiError && caught.status === 409) setConflict(true);
    setError(errorMessage(caught));
  };

  const refresh = async () => {
    setLoading(true);
    setError('');
    setConflict(false);
    try {
      const data = await loadHomepage(token);
      setServerData(data);
      setTranslations(cloneTranslations(data.translations));
      setDirty(false);
      editSequence.current = 0;
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [token]);

  useEffect(() => {
    let active = true;
    setMediaError('');
    loadMedia(token).then((data) => { if (active) setAssets(data); }).catch((caught) => {
      if (!active) return;
      if (caught instanceof AdminApiError && caught.status === 401) onLogout();
      else setMediaError(errorMessage(caught));
    });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const currentTranslation = translations.find((translation) => translation.locale === locale);
  const currentBlock = currentTranslation?.blocks.blocks.find((block) => block.type === activeBlock);
  const validationErrors = useMemo(() => validateTranslations(translations), [translations]);

  const updateTranslation = (updater: (translation: HomepageTranslation) => HomepageTranslation) => {
    setTranslations((current) => current.map((translation) => translation.locale === locale ? updater(translation) : translation));
    setDirty(true);
    setNotice('');
    setError('');
    setConflict(false);
    editSequence.current += 1;
  };

  const updateBlock = (block: HomeBlock) => updateTranslation((translation) => ({
    ...translation,
    blocks: {
      ...translation.blocks,
      blocks: translation.blocks.blocks.map((candidate) => candidate.type === block.type ? block : candidate),
    },
  }));

  const save = async () => {
    if (!serverData || validationErrors.length) return;
    setSaving(true);
    setError('');
    setConflict(false);
    const submittedEditSequence = editSequence.current;
    const submittedTranslations = cloneTranslations(translations);
    try {
      const data = await saveHomepageDraft(token, serverData.revision, submittedTranslations);
      setServerData(data);
      if (editSequence.current === submittedEditSequence) {
        setTranslations(cloneTranslations(data.translations));
        setDirty(false);
        setNotice(`草稿已保存（Revision ${data.revision}）。`);
      } else {
        setDirty(true);
        setNotice(`Revision ${data.revision} 已保存；请求发出后的修改仍未保存。`);
      }
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!serverData || dirty) return;
    setPublishing(true);
    setError('');
    setConflict(false);
    const submittedEditSequence = editSequence.current;
    try {
      const data = await publishHomepage(token, serverData.revision);
      setServerData(data);
      if (editSequence.current === submittedEditSequence) {
        setTranslations(cloneTranslations(data.translations));
        setDirty(false);
        setNotice(`Revision ${data.revision} 已发布到官网。`);
      } else {
        setDirty(true);
        setNotice(`Revision ${data.revision} 已发布；发布请求发出后的修改仍未保存。`);
      }
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setPublishing(false);
    }
  };

  const upload = async (file: File, altZh: string, altEn: string) => {
    try {
      const asset = await uploadMedia(token, file, altZh, altEn);
      setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setMediaError('');
      return asset;
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 401) onLogout();
      throw caught;
    }
  };

  const requestLogout = () => {
    if (dirty && !window.confirm('仍有未保存的首页修改。确定退出并放弃这些修改吗？')) return;
    onLogout();
  };

  if (loading) return <main className="cms-loading"><span className="cms-spinner" />正在读取 Homepage 草稿…</main>;

  if (!serverData || !currentTranslation || !currentBlock) return <main className="cms-fatal">
    <p className="cms-kicker">HOMEPAGE CMS</p><h1>无法打开编辑器</h1>
    <div className="cms-alert is-error" role="alert">{error || '首页内容缺失或不符合双语七区块协议。'}</div>
    <button className="cms-primary-button" type="button" onClick={() => void refresh()}>重新读取</button>
    <button className="cms-subtle-button" type="button" onClick={onLogout}>退出登录</button>
  </main>;

  return <div className="cms-shell">
    <header className="cms-topbar">
      <div><span>观止东方</span><small>HOMEPAGE CMS</small></div>
      <div className="cms-top-actions">
        <a className="cms-secondary-button" href="/" target="_blank" rel="noreferrer">查看官网 ↗</a>
        <span className="cms-user">{user.displayName}<small>{user.role}</small></span>
        <button type="button" className="cms-text-button" onClick={requestLogout}>退出</button>
      </div>
    </header>
    <aside className="cms-sidebar" aria-label="首页区块导航">
      <div className="cms-page-title"><p>CONTENT / HOME</p><h1>首页内容</h1><small>固定双语 · 七区块</small></div>
      <nav>{HOME_BLOCK_ORDER.map((type, index) => {
        const block = currentTranslation.blocks.blocks.find((item) => item.type === type);
        return <button type="button" key={type} className={activeBlock === type ? 'is-active' : ''} onClick={() => setActiveBlock(type)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{BLOCK_LABELS[type]}</strong><i className={block?.enabled ? 'is-enabled' : ''} title={block?.enabled ? '显示' : '隐藏'} /></button>;
      })}</nav>
      <div className="cms-sidebar-note">本编辑器不支持任意组件、HTML、CSS 或页面路由。页面结构由 Typed Content Contract 固定。</div>
    </aside>
    <main className="cms-main">
      <section className="cms-command-bar">
        <div className="cms-locale-tabs" role="tablist" aria-label="编辑语言">
          <button type="button" role="tab" aria-selected={locale === 'zh-CN'} onClick={() => setLocale('zh-CN')}>中文 zh-CN</button>
          <button type="button" role="tab" aria-selected={locale === 'en'} onClick={() => setLocale('en')}>English en</button>
        </div>
        <div className="cms-save-state">
          <span className={dirty ? 'is-dirty' : ''}>{dirty ? '● 有未保存修改' : '✓ 已保存'}</span>
          <small>Revision {serverData.revision} · {serverData.source === 'draft' ? '草稿来源' : '已发布来源'}</small>
        </div>
        <button className="cms-secondary-button" type="button" disabled={saving || publishing || !dirty || validationErrors.length > 0} onClick={() => void save()}>{saving ? '保存中…' : '保存草稿'}</button>
        <button className="cms-primary-button" type="button" disabled={saving || publishing || dirty || validationErrors.length > 0 || serverData.source !== 'draft' || user.role !== 'ADMIN'} onClick={() => void publish()} title={user.role !== 'ADMIN' ? '只有管理员可以发布' : dirty ? '请先保存草稿' : serverData.source !== 'draft' ? '当前没有待发布草稿' : undefined}>{publishing ? '发布中…' : '发布到官网'}</button>
      </section>
      <section className="cms-page-fields">
        <div className="cms-section-head"><div><p>{locale.toUpperCase()} / SEO</p><h2>页面基础信息</h2></div><span className={`cms-status-badge ${serverData.page.status.toLowerCase()}`}>{serverData.page.status === 'PUBLISHED' ? '官网已发布' : '官网未发布'}</span></div>
        <div className="cms-field-grid">
          <label className="cms-field"><span>页面标题 *</span><input value={currentTranslation.title} maxLength={200} onChange={(event) => updateTranslation((translation) => ({ ...translation, title: event.target.value }))} /></label>
          <label className="cms-field"><span>SEO Title</span><input value={currentTranslation.seoTitle ?? ''} maxLength={200} onChange={(event) => updateTranslation((translation) => ({ ...translation, seoTitle: event.target.value || null }))} /></label>
        </div>
        <label className="cms-field"><span>SEO Description</span><textarea rows={3} value={currentTranslation.seoDescription ?? ''} maxLength={500} onChange={(event) => updateTranslation((translation) => ({ ...translation, seoDescription: event.target.value || null }))} /><small>{(currentTranslation.seoDescription ?? '').length} / 500</small></label>
      </section>
      <section className="cms-editor-panel">
        <header className="cms-section-head"><div><p>{locale.toUpperCase()} / BLOCK {String(HOME_BLOCK_ORDER.indexOf(activeBlock) + 1).padStart(2, '0')}</p><h2>{BLOCK_LABELS[activeBlock]}</h2></div></header>
        {notice && <div className="cms-alert is-success" role="status">{notice}</div>}
        {error && <div className="cms-alert is-error" role="alert">{error}{conflict && <><br />服务器已存在更新版本。请重新读取后再继续，避免覆盖他人的修改。</>}</div>}
        {conflict && <button className="cms-secondary-button" type="button" onClick={() => void refresh()}>放弃本地修改并读取最新版本</button>}
        {validationErrors.length > 0 && <div className="cms-alert is-warning" role="alert"><strong>保存前需要修正：</strong><ul>{validationErrors.slice(0, 8).map((message) => <li key={message}>{message}</li>)}</ul></div>}
        <BlockEditor block={currentBlock} locale={locale} assets={assets} mediaError={mediaError} onChange={updateBlock} onUpload={upload} />
      </section>
    </main>
  </div>;
}
