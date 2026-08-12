import type { AdminMediaAsset, CapabilityItem, ContentLocale, HomeBlock, MotifItem, PartnerItem } from './types';
import { BlockBaseFields, CtaFields, LineList, MediaField, TextAreaField, TextField } from './EditorFields';

type Props = {
  block: HomeBlock;
  locale: ContentLocale;
  assets: AdminMediaAsset[];
  mediaError: string;
  onChange: (block: HomeBlock) => void;
  onUpload: (file: File, altZh: string, altEn: string) => Promise<AdminMediaAsset>;
};

function moveItem<T extends { order: number }>(items: T[], index: number, delta: -1 | 1) {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target]!, copy[index]!];
  return copy.map((item, itemIndex) => ({ ...item, order: (itemIndex + 1) * 10 }));
}

function ListItemShell({ children, enabled, index, length, title, onEnabled, onMove, onRemove }: {
  children: React.ReactNode;
  enabled: boolean;
  index: number;
  length: number;
  title: string;
  onEnabled: (enabled: boolean) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  return <article className="cms-item-card">
    <header>
      <strong>{title}</strong>
      <div className="cms-item-actions">
        <label><input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} /> 显示</label>
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label="上移">↑</button>
        <button type="button" disabled={index === length - 1} onClick={() => onMove(1)} aria-label="下移">↓</button>
        <button type="button" className="is-danger" disabled={length <= 1} onClick={onRemove}>删除</button>
      </div>
    </header>
    {children}
  </article>;
}

export function BlockEditor({ block, locale, assets, mediaError, onChange, onUpload }: Props) {
  const set = <T extends HomeBlock>(next: T) => onChange(next);

  if (block.type === 'hero') return <div className="cms-block-form">
    <BlockBaseFields block={block} onChange={onChange} locale={locale} />
    <TextField label="Eyebrow" value={block.eyebrow} onChange={(eyebrow) => set({ ...block, eyebrow })} required maxLength={160} />
    <LineList label="主标题行" values={block.headingLines} onChange={(headingLines) => set({ ...block, headingLines })} max={5} />
    <label className="cms-field"><span>强调标题行</span><select value={block.emphasisLine ?? ''} onChange={(event) => set({ ...block, ...(event.target.value === '' ? { emphasisLine: undefined } : { emphasisLine: Number(event.target.value) }) })}><option value="">不强调</option>{block.headingLines.map((_, index) => <option key={index} value={index}>第 {index + 1} 行</option>)}</select></label>
    <TextAreaField label="说明" value={block.description} onChange={(description) => set({ ...block, description })} required maxLength={500} />
    <CtaFields value={block.primaryCta} onChange={(primaryCta) => set({ ...block, primaryCta })} />
    {block.secondaryCta
      ? <CtaFields value={block.secondaryCta} onChange={(secondaryCta) => set({ ...block, secondaryCta })} optional onRemove={() => set({ ...block, secondaryCta: undefined })} />
      : <button type="button" className="cms-subtle-button" onClick={() => set({ ...block, secondaryCta: { label: '次要操作', action: 'scroll', target: 'about' } })}>＋ 添加次要 CTA</button>}
    <MediaField label="Hero 视频" kind="video" value={block.media} onChange={(media) => set({ ...block, media })} assets={assets} mediaError={mediaError} onUpload={onUpload} />
    {block.media.poster
      ? <MediaField label="视频 Poster" kind="image" value={block.media.poster} onChange={(poster) => set({ ...block, media: { ...block.media, poster } })} assets={assets} mediaError={mediaError} onUpload={onUpload} />
      : <button type="button" className="cms-subtle-button" onClick={() => set({ ...block, media: { ...block.media, poster: { fallbackUrl: '/images/hero-poster.svg', alt: { 'zh-CN': 'Hero 视频封面' }, mimeType: 'image/svg+xml' } } })}>＋ 添加视频 Poster</button>}
    {block.meta && <div className="cms-field-grid"><TextField label="品牌代码" value={block.meta.brandCode} onChange={(brandCode) => set({ ...block, meta: { ...block.meta!, brandCode } })} maxLength={40} /><TextField label="地点 / 年份辅助文字" value={block.meta.locationAndYear} onChange={(locationAndYear) => set({ ...block, meta: { ...block.meta!, locationAndYear } })} maxLength={80} hint="不要写入尚未确认的公司所在地。" /></div>}
  </div>;

  if (block.type === 'about') return <div className="cms-block-form">
    <BlockBaseFields block={block} onChange={onChange} locale={locale} />
    <TextField label="Lead" value={block.lead} onChange={(lead) => set({ ...block, lead })} required maxLength={200} />
    <LineList label="标题行" values={block.headingLines} onChange={(headingLines) => set({ ...block, headingLines })} max={4} />
    <LineList label="正式正文段落" values={block.paragraphs} onChange={(paragraphs) => set({ ...block, paragraphs })} max={8} multiline />
    {block.statement ? <fieldset className="cms-fieldset"><legend>数据陈述（可选）</legend><TextField label="突出值" value={block.statement.value} onChange={(value) => set({ ...block, statement: { ...block.statement!, value } })} maxLength={40} /><TextAreaField label="说明" value={block.statement.text} onChange={(text) => set({ ...block, statement: { ...block.statement!, text } })} maxLength={300} rows={2} /><button type="button" className="cms-danger-link" onClick={() => set({ ...block, statement: undefined })}>移除数据陈述</button></fieldset> : <button type="button" className="cms-subtle-button" onClick={() => set({ ...block, statement: { value: '', text: '' } })}>＋ 添加数据陈述</button>}
  </div>;

  if (block.type === 'capabilities') {
    const updateItems = (items: CapabilityItem[]) => set({ ...block, items });
    return <div className="cms-block-form"><BlockBaseFields block={block} onChange={onChange} locale={locale} /><LineList label="标题行" values={block.headingLines} onChange={(headingLines) => set({ ...block, headingLines })} max={4} /><TextAreaField label="简介" value={block.intro} onChange={(intro) => set({ ...block, intro })} required maxLength={500} />
      <div className="cms-items"><h3>能力项目</h3>{block.items.map((item, index) => <ListItemShell key={item.id} enabled={item.enabled} index={index} length={block.items.length} title={`${item.number || '—'} · ${item.title || '未命名能力'}`} onEnabled={(enabled) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, enabled } : candidate))} onMove={(delta) => updateItems(moveItem(block.items, index, delta))} onRemove={() => updateItems(block.items.filter((candidate) => candidate.id !== item.id))}><div className="cms-field-grid"><TextField label="编号" value={item.number} onChange={(number) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, number } : candidate))} required maxLength={10} /><TextField label="标题" value={item.title} onChange={(title) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, title } : candidate))} required maxLength={120} /></div><TextAreaField label="说明" value={item.description} onChange={(description) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, description } : candidate))} required maxLength={1000} /></ListItemShell>)}<button type="button" className="cms-subtle-button" disabled={block.items.length >= 24} onClick={() => updateItems([...block.items, { id: `capability-${Date.now()}`, enabled: true, order: (block.items.length + 1) * 10, number: String(block.items.length + 1).padStart(2, '0'), title: '', description: '' }])}>＋ 添加能力</button></div>
    </div>;
  }

  if (block.type === 'motifs') {
    const updateItems = (items: MotifItem[]) => set({ ...block, items });
    return <div className="cms-block-form"><BlockBaseFields block={block} onChange={onChange} locale={locale} /><LineList label="标题行" values={block.headingLines} onChange={(headingLines) => set({ ...block, headingLines })} max={4} /><TextAreaField label="简介" value={block.intro} onChange={(intro) => set({ ...block, intro })} required maxLength={500} />
      <div className="cms-items"><h3>文化母题</h3>{block.items.map((item, index) => <ListItemShell key={item.id} enabled={item.enabled} index={index} length={block.items.length} title={item.title || '未命名母题'} onEnabled={(enabled) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, enabled } : candidate))} onMove={(delta) => updateItems(moveItem(block.items, index, delta))} onRemove={() => updateItems(block.items.filter((candidate) => candidate.id !== item.id))}><div className="cms-field-grid"><TextField label="标题" value={item.title} onChange={(title) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, title } : candidate))} required maxLength={120} /><TextField label="英文辅助标题" value={item.titleEn} onChange={(titleEn) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, titleEn } : candidate))} required maxLength={120} /></div><div className="cms-field-grid"><TextAreaField label="说明" value={item.description} onChange={(description) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, description } : candidate))} required maxLength={500} /><TextField label="研发状态" value={item.status} onChange={(status) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, status } : candidate))} required maxLength={80} /></div><MediaField label="母题图片" kind="image" value={item.media} onChange={(media) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, media } : candidate))} assets={assets} mediaError={mediaError} onUpload={onUpload} /></ListItemShell>)}<button type="button" className="cms-subtle-button" disabled={block.items.length >= 24} onClick={() => updateItems([...block.items, { id: `motif-${Date.now()}`, enabled: true, order: (block.items.length + 1) * 10, title: '', titleEn: '', description: '', status: '', media: { alt: { 'zh-CN': '' } } }])}>＋ 添加母题</button></div>
    </div>;
  }

  if (block.type === 'jiangnan') return <div className="cms-block-form"><BlockBaseFields block={block} onChange={onChange} locale={locale} /><LineList label="标题行" values={block.headingLines} onChange={(headingLines) => set({ ...block, headingLines })} max={5} /><TextAreaField label="说明" value={block.description} onChange={(description) => set({ ...block, description })} required maxLength={1200} />{block.cta ? <CtaFields value={block.cta} onChange={(cta) => set({ ...block, cta })} optional onRemove={() => set({ ...block, cta: undefined })} /> : <button type="button" className="cms-subtle-button" onClick={() => set({ ...block, cta: { label: '了解更多', action: 'scroll', target: 'contact' } })}>＋ 添加 CTA</button>}<MediaField label="Into Jiangnan 图片" kind="image" value={block.media} onChange={(media) => set({ ...block, media })} assets={assets} mediaError={mediaError} onUpload={onUpload} /></div>;

  if (block.type === 'partners') {
    const updateItems = (items: PartnerItem[]) => set({ ...block, items });
    return <div className="cms-block-form"><BlockBaseFields block={block} onChange={onChange} locale={locale} /><TextAreaField label="标题" value={block.heading} onChange={(heading) => set({ ...block, heading })} required maxLength={240} rows={2} /><div className="cms-items"><h3>伙伴类型</h3>{block.items.map((item, index) => <ListItemShell key={item.id} enabled={item.enabled} index={index} length={block.items.length} title={item.title || '未命名伙伴'} onEnabled={(enabled) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, enabled } : candidate))} onMove={(delta) => updateItems(moveItem(block.items, index, delta))} onRemove={() => updateItems(block.items.filter((candidate) => candidate.id !== item.id))}><TextField label="标题" value={item.title} onChange={(title) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, title } : candidate))} required maxLength={160} /><TextAreaField label="说明（可选）" value={item.description ?? ''} onChange={(description) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, description: description || undefined } : candidate))} maxLength={500} /><MediaField label="伙伴图片" kind="image" value={item.media} onChange={(media) => updateItems(block.items.map((candidate) => candidate.id === item.id ? { ...candidate, media } : candidate))} assets={assets} mediaError={mediaError} onUpload={onUpload} /></ListItemShell>)}<button type="button" className="cms-subtle-button" disabled={block.items.length >= 40} onClick={() => updateItems([...block.items, { id: `partner-${Date.now()}`, enabled: true, order: (block.items.length + 1) * 10, title: '', media: { alt: { 'zh-CN': '' } } }])}>＋ 添加伙伴类型</button></div></div>;
  }

  return <div className="cms-block-form"><BlockBaseFields block={block} onChange={onChange} locale={locale} /><TextField label="Kicker" value={block.kicker} onChange={(kicker) => set({ ...block, kicker })} required maxLength={300} /><LineList label="标题行" values={block.headingLines} onChange={(headingLines) => set({ ...block, headingLines })} max={4} /><TextAreaField label="说明（可选）" value={block.description ?? ''} onChange={(description) => set({ ...block, description: description || undefined })} maxLength={1000} /><CtaFields value={block.cta} onChange={(cta) => set({ ...block, cta })} /></div>;
}
