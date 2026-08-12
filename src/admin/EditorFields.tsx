import { useMemo, useState } from 'react';
import type {
  AdminMediaAsset,
  ContentCta,
  ContentLocale,
  HomeBlock,
  MediaReference,
} from './types';

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  hint?: string;
  type?: 'text' | 'url';
};

export function TextField({ label, value, onChange, required, maxLength, hint, type = 'text' }: FieldProps) {
  return <label className="cms-field">
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} />
    {hint && <small>{hint}</small>}
  </label>;
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <label className="cms-field">
    <span>{label}</span>
    <input value={value} readOnly disabled />
    <small>{hint}</small>
  </label>;
}

export function TextAreaField({ label, value, onChange, required, maxLength, hint, rows = 4 }: FieldProps & { rows?: number }) {
  return <label className="cms-field">
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} rows={rows} />
    <small>{hint ?? (maxLength ? `${value.length} / ${maxLength}` : '')}</small>
  </label>;
}

export function LineList({
  label,
  values,
  onChange,
  min = 1,
  max,
  multiline = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  min?: number;
  max: number;
  multiline?: boolean;
}) {
  return <fieldset className="cms-fieldset">
    <legend>{label}</legend>
    <div className="cms-repeat-list">
      {values.map((value, index) => <div className="cms-repeat-row" key={index}>
        <span className="cms-row-number">{String(index + 1).padStart(2, '0')}</span>
        {multiline
          ? <textarea rows={4} value={value} onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
          : <input value={value} onChange={(event) => onChange(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />}
        <button type="button" className="cms-icon-button" disabled={values.length <= min} onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} aria-label={`删除第 ${index + 1} 项`}>×</button>
      </div>)}
    </div>
    <button type="button" className="cms-subtle-button" disabled={values.length >= max} onClick={() => onChange([...values, ''])}>＋ 添加一项</button>
  </fieldset>;
}

export function CtaFields({ value, onChange, optional, onRemove }: {
  value: ContentCta;
  onChange: (value: ContentCta) => void;
  optional?: boolean;
  onRemove?: () => void;
}) {
  return <fieldset className="cms-fieldset cms-cta-fields">
    <legend>CTA 操作{optional ? '（可选）' : ''}</legend>
    <div className="cms-field-grid">
      <TextField label="按钮文案" value={value.label} onChange={(label) => onChange({ ...value, label })} required maxLength={80} />
      <label className="cms-field">
        <span>操作类型 *</span>
        <select value={value.action} onChange={(event) => onChange({ ...value, action: event.target.value as ContentCta['action'] })}>
          <option value="scroll">滚动到站内区块</option>
          <option value="inquiry">打开合作咨询</option>
          <option value="link">外部链接</option>
        </select>
      </label>
    </div>
    <TextField
      label={value.action === 'link' ? 'HTTPS / mailto 地址' : '目标标识'}
      value={value.target}
      onChange={(target) => onChange({ ...value, target })}
      required
      maxLength={500}
      hint={value.action === 'link' ? '只允许 https:// 或 mailto:' : '小写字母开头，仅小写字母、数字和连字符'}
    />
    {optional && onRemove && <button className="cms-danger-link" type="button" onClick={onRemove}>移除这个 CTA</button>}
  </fieldset>;
}

function mediaKindMatches(asset: AdminMediaAsset, kind: 'image' | 'video') {
  return asset.category === kind || asset.mimeType.startsWith(`${kind}/`);
}

function MediaPicker({
  kind,
  assets,
  currentAssetId,
  mediaError,
  onClose,
  onChoose,
  onUpload,
}: {
  kind: 'image' | 'video';
  assets: AdminMediaAsset[];
  currentAssetId?: string;
  mediaError: string;
  onClose: () => void;
  onChoose: (asset: AdminMediaAsset) => void;
  onUpload: (file: File, altZh: string, altEn: string) => Promise<AdminMediaAsset>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [altZh, setAltZh] = useState('');
  const [altEn, setAltEn] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const compatibleAssets = useMemo(() => assets.filter((asset) => mediaKindMatches(asset, kind)), [assets, kind]);

  const upload = async () => {
    if (!file || !altZh.trim()) {
      setUploadError('请选择文件并填写中文替代文本。');
      return;
    }
    const fileMatchesKind = kind === 'image'
      ? ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)
      : file.type === 'video/mp4';
    if (!fileMatchesKind) {
      setUploadError(`请选择受支持的${kind === 'image' ? '图片' : ' MP4 视频'}文件。`);
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const asset = await onUpload(file, altZh, altEn);
      if (!mediaKindMatches(asset, kind)) throw new Error(`上传结果不是${kind === 'image' ? '图片' : '视频'}资产。`);
      onChoose(asset);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return <div className="cms-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="cms-media-modal" role="dialog" aria-modal="true" aria-labelledby="media-picker-title" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <div><p>MEDIA LIBRARY</p><h2 id="media-picker-title">选择{kind === 'image' ? '图片' : '视频'}</h2></div>
        <button type="button" className="cms-modal-close" onClick={onClose} aria-label="关闭媒体选择器">×</button>
      </header>
      {mediaError && <div className="cms-alert is-error" role="alert">{mediaError}</div>}
      {compatibleAssets.length > 0 ? <div className="cms-media-grid">
        {compatibleAssets.map((asset) => {
          const missingAlt = !asset.alt['zh-CN']?.trim();
          return <button type="button" className={asset.id === currentAssetId ? 'is-selected' : ''} key={asset.id} disabled={missingAlt} title={missingAlt ? '该资产缺少中文 alt，不能用于 Homepage' : undefined} onClick={() => onChoose(asset)}>
          {kind === 'image' ? <img src={asset.url} alt={asset.alt['zh-CN'] || asset.name} /> : <div className="cms-video-tile">MP4</div>}
          <span>{asset.name}</span>
          <small>{missingAlt ? '缺少中文 alt · 不可选择' : `${asset.width && asset.height ? `${asset.width} × ${asset.height} · ` : ''}${(asset.size / 1024 / 1024).toFixed(2)} MiB`}</small>
        </button>})}
      </div> : <div className="cms-empty-state">
        <strong>媒体库暂无可用{kind === 'image' ? '图片' : '视频'}</strong>
        <p>可在下方上传首个资产；既有站点相对 URL 仍会保留，直到选择媒体资产。</p>
      </div>}
      <fieldset className="cms-upload-box">
        <legend>上传新{kind === 'image' ? '图片' : '视频'}</legend>
        <input type="file" accept={kind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : 'video/mp4'} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <div className="cms-field-grid">
          <TextField label="中文替代文本" value={altZh} onChange={setAltZh} required maxLength={300} />
          <TextField label="英文替代文本" value={altEn} onChange={setAltEn} maxLength={300} />
        </div>
        {uploadError && <div className="cms-alert is-error" role="alert">{uploadError}</div>}
        <button className="cms-primary-button" type="button" disabled={uploading} onClick={upload}>{uploading ? '正在上传…' : '上传并选择'}</button>
        <small>允许 JPEG、PNG、WebP、AVIF（图片最大 12 MiB）或 MP4（最大 50 MiB）；SVG 不允许上传。</small>
      </fieldset>
    </section>
  </div>;
}

export function MediaField({
  label,
  value,
  onChange,
  kind,
  assets,
  mediaError,
  onUpload,
}: {
  label: string;
  value: MediaReference;
  onChange: (value: MediaReference) => void;
  kind: 'image' | 'video';
  assets: AdminMediaAsset[];
  mediaError: string;
  onUpload: (file: File, altZh: string, altEn: string) => Promise<AdminMediaAsset>;
}) {
  const [open, setOpen] = useState(false);
  const selected = assets.find((asset) => asset.id === value.assetId);
  const previewUrl = selected?.url ?? value.fallbackUrl;

  const choose = (asset: AdminMediaAsset) => {
    onChange({
      assetId: asset.id,
      alt: {
        'zh-CN': asset.alt['zh-CN'] || '',
        ...(asset.alt.en ? { en: asset.alt.en } : {}),
      },
      mimeType: asset.mimeType,
      ...(asset.width ? { width: asset.width } : {}),
      ...(asset.height ? { height: asset.height } : {}),
    });
    setOpen(false);
  };

  return <fieldset className="cms-fieldset cms-media-field">
    <legend>{label}</legend>
    <div className="cms-media-current">
      {previewUrl
        ? kind === 'image'
          ? <img src={previewUrl} alt="当前媒体预览" />
          : <div className="cms-video-tile">VIDEO</div>
        : <div className="cms-media-placeholder">尚未选择媒体</div>}
      <div>
        <strong>{selected?.name ?? (value.assetId ? '媒体资产未出现在当前列表' : value.fallbackUrl ? '迁移期站点文件' : '无媒体')}</strong>
        <small>{selected ? `${selected.mimeType} · ${(selected.size / 1024 / 1024).toFixed(2)} MiB` : value.fallbackUrl ?? '请选择或上传资产'}</small>
        <button type="button" className="cms-secondary-button" onClick={() => setOpen(true)}>从媒体库选择</button>
      </div>
    </div>
    <div className="cms-field-grid">
      {value.assetId
        ? <ReadOnlyField label="中文替代文本（随媒体资产）" value={selected?.alt['zh-CN'] ?? value.alt['zh-CN']} hint="assetId 引用以媒体库元数据为权威。" />
        : <TextField label="中文替代文本" value={value.alt['zh-CN']} onChange={(text) => onChange({ ...value, alt: { ...value.alt, 'zh-CN': text } })} required maxLength={500} />}
      {value.assetId
        ? <ReadOnlyField label="英文替代文本（随媒体资产）" value={selected?.alt.en ?? value.alt.en ?? ''} hint="如需修改，请重新上传带正确 alt 的资产。" />
        : <TextField label="英文替代文本" value={value.alt.en ?? ''} onChange={(text) => onChange({ ...value, alt: { ...value.alt, ...(text ? { en: text } : { en: undefined }) } })} maxLength={500} />}
    </div>
    {value.fallbackUrl && !value.assetId && <TextField label="迁移期站点相对 URL" value={value.fallbackUrl} onChange={(fallbackUrl) => onChange({ ...value, fallbackUrl })} required hint="必须以单个 / 开头；不会暴露服务器存储路径。" />}
    {open && <MediaPicker kind={kind} assets={assets} currentAssetId={value.assetId} mediaError={mediaError} onClose={() => setOpen(false)} onChoose={choose} onUpload={onUpload} />}
  </fieldset>;
}

export function BlockBaseFields({ block, onChange, locale }: {
  block: HomeBlock;
  onChange: (block: HomeBlock) => void;
  locale: ContentLocale;
}) {
  return <div className="cms-block-settings">
    <label className="cms-check-field">
      <input
        type="checkbox"
        checked={block.enabled}
        disabled={block.type === 'hero'}
        onChange={(event) => onChange({ ...block, enabled: event.target.checked } as HomeBlock)}
      />
      <span>{block.type === 'hero' ? 'Hero 是首页必显区块' : '在官网显示此区块'}</span>
    </label>
    <label className="cms-field cms-status-field">
      <span>内容状态</span>
      <select value={block.contentStatus} onChange={(event) => onChange({ ...block, contentStatus: event.target.value as HomeBlock['contentStatus'] } as HomeBlock)}>
        <option value="approved">approved · 已确认</option>
        <option value="draft">draft · 待确认</option>
      </select>
    </label>
    <span className="cms-order-chip">固定顺序 {block.order}</span>
    {locale === 'en' && block.contentStatus === 'draft' && <small className="cms-draft-note">该英文区块尚待甲方确认。</small>}
  </div>;
}
