export type ContentLocale = 'zh-CN' | 'en';
export type ContentStatus = 'approved' | 'draft';

export type LocalizedText = {
  'zh-CN': string;
  en?: string;
};

export type MediaReference = {
  assetId?: string;
  fallbackUrl?: string;
  alt: LocalizedText;
  mimeType?: string;
  width?: number;
  height?: number;
  poster?: MediaReference;
};

export type ContentCta = {
  label: string;
  action: 'scroll' | 'inquiry' | 'link';
  target: string;
};

type BlockBase = {
  enabled: boolean;
  order: number;
  contentStatus: ContentStatus;
};

type ItemBase = {
  id: string;
  enabled: boolean;
  order: number;
};

export type HeroBlock = BlockBase & {
  type: 'hero';
  eyebrow: string;
  headingLines: string[];
  emphasisLine?: number;
  description: string;
  primaryCta: ContentCta;
  secondaryCta?: ContentCta;
  media: MediaReference;
  meta?: { brandCode: string; locationAndYear: string };
};

export type AboutBlock = BlockBase & {
  type: 'about';
  lead: string;
  headingLines: string[];
  paragraphs: string[];
  statement?: { value: string; text: string };
};

export type CapabilityItem = ItemBase & {
  number: string;
  title: string;
  description: string;
};

export type CapabilitiesBlock = BlockBase & {
  type: 'capabilities';
  headingLines: string[];
  intro: string;
  items: CapabilityItem[];
};

export type MotifItem = ItemBase & {
  title: string;
  titleEn: string;
  description: string;
  status: string;
  media: MediaReference;
};

export type MotifsBlock = BlockBase & {
  type: 'motifs';
  headingLines: string[];
  intro: string;
  items: MotifItem[];
};

export type JiangnanBlock = BlockBase & {
  type: 'jiangnan';
  headingLines: string[];
  description: string;
  cta?: ContentCta;
  media: MediaReference;
};

export type PartnerItem = ItemBase & {
  title: string;
  description?: string;
  media: MediaReference;
};

export type PartnersBlock = BlockBase & {
  type: 'partners';
  heading: string;
  items: PartnerItem[];
};

export type ContactBlock = BlockBase & {
  type: 'contact';
  kicker: string;
  headingLines: string[];
  description?: string;
  cta: ContentCta;
};

export type HomeBlock =
  | HeroBlock
  | AboutBlock
  | CapabilitiesBlock
  | MotifsBlock
  | JiangnanBlock
  | PartnersBlock
  | ContactBlock;

export type HomeDocument = {
  version: 1;
  blocks: HomeBlock[];
};

export type HomepageTranslation = {
  locale: ContentLocale;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  blocks: HomeDocument;
};

export type AdminHomepageData = {
  page: {
    id: string;
    slug: 'home';
    status: 'DRAFT' | 'PUBLISHED';
    publishedAt: string | null;
    updatedAt: string;
  };
  revision: number;
  savedAt: string | null;
  source: 'published' | 'draft';
  translations: HomepageTranslation[];
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'EDITOR';
};

export type AdminMediaAsset = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: Partial<LocalizedText>;
  category: string | null;
  createdAt: string;
  url: string;
  usage: { referenced: boolean; deletable: boolean };
};

export const HOME_BLOCK_ORDER: HomeBlock['type'][] = [
  'hero',
  'about',
  'capabilities',
  'motifs',
  'jiangnan',
  'partners',
  'contact',
];

export const BLOCK_LABELS: Record<HomeBlock['type'], string> = {
  hero: 'Hero 首屏',
  about: 'About 品牌介绍',
  capabilities: 'Capabilities 核心能力',
  motifs: 'Motifs 文化母题',
  jiangnan: 'Into Jiangnan',
  partners: 'Partners 合作伙伴',
  contact: 'Contact 合作咨询',
};
