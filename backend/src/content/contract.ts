import { z } from 'zod';

export const CONTENT_CONTRACT_VERSION = 1 as const;
export const localeSchema = z.enum(['zh-CN', 'en']);
export type ContentLocale = z.infer<typeof localeSchema>;

export const localizedTextSchema = z.object({
  'zh-CN': z.string().trim().min(1).max(500),
  en: z.string().trim().min(1).max(500).optional(),
}).strict();

const mediaCoreSchema = z.object({
  assetId: z.uuid().optional(),
  fallbackUrl: z.string().trim().regex(/^\/(?!\/)/, 'fallbackUrl 必须是站点相对 URL').optional(),
  alt: localizedTextSchema,
  mimeType: z.string().trim().max(100).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
}).strict().refine((value) => value.assetId || value.fallbackUrl, {
  message: '媒体引用必须提供 assetId 或 fallbackUrl',
});

export const mediaReferenceSchema = mediaCoreSchema.extend({
  poster: mediaCoreSchema.optional(),
}).strict();
export type MediaReference = z.infer<typeof mediaReferenceSchema>;

export const ctaSchema = z.object({
  label: z.string().trim().min(1).max(80),
  action: z.enum(['scroll', 'inquiry', 'link']),
  target: z.string().trim().min(1).max(500),
}).strict().superRefine((cta, context) => {
  if (cta.action === 'link' && !/^https:\/\//i.test(cta.target) && !/^mailto:/i.test(cta.target)) {
    context.addIssue({ code: 'custom', path: ['target'], message: '外部 CTA 只允许 HTTPS 或 mailto URL' });
  }
  if (cta.action !== 'link' && !/^[a-z][a-z0-9-]*$/.test(cta.target)) {
    context.addIssue({ code: 'custom', path: ['target'], message: '站内 CTA target 必须是安全标识符' });
  }
});

const blockBase = {
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(1000),
};

export const heroBlockSchema = z.object({
  type: z.literal('hero'),
  ...blockBase,
  eyebrow: z.string().trim().min(1).max(160),
  headingLines: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
  emphasisLine: z.number().int().min(0).max(4).optional(),
  description: z.string().trim().min(1).max(500),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema.optional(),
  media: mediaReferenceSchema,
  meta: z.object({
    brandCode: z.string().trim().min(1).max(40),
    locationAndYear: z.string().trim().min(1).max(80),
  }).strict().optional(),
}).strict();

export const aboutBlockSchema = z.object({
  type: z.literal('about'),
  ...blockBase,
  lead: z.string().trim().min(1).max(200),
  headingLines: z.array(z.string().trim().min(1).max(160)).min(1).max(4),
  paragraphs: z.array(z.string().trim().min(1).max(2000)).min(1).max(8),
  statement: z.object({
    value: z.string().trim().min(1).max(40),
    text: z.string().trim().min(1).max(300),
  }).strict().optional(),
}).strict();

export const capabilityItemSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(1000),
  number: z.string().trim().min(1).max(10),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
}).strict();

export const capabilitiesBlockSchema = z.object({
  type: z.literal('capabilities'),
  ...blockBase,
  headingLines: z.array(z.string().trim().min(1).max(160)).min(1).max(4),
  intro: z.string().trim().min(1).max(500),
  items: z.array(capabilityItemSchema).min(1).max(24),
}).strict();

export const motifItemSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(1000),
  title: z.string().trim().min(1).max(120),
  titleEn: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  status: z.string().trim().min(1).max(80),
  media: mediaReferenceSchema,
}).strict();

export const motifsBlockSchema = z.object({
  type: z.literal('motifs'),
  ...blockBase,
  headingLines: z.array(z.string().trim().min(1).max(160)).min(1).max(4),
  intro: z.string().trim().min(1).max(500),
  items: z.array(motifItemSchema).min(1).max(24),
}).strict();

export const jiangnanBlockSchema = z.object({
  type: z.literal('jiangnan'),
  ...blockBase,
  headingLines: z.array(z.string().trim().min(1).max(160)).min(1).max(5),
  description: z.string().trim().min(1).max(1200),
  cta: ctaSchema.optional(),
  media: mediaReferenceSchema,
}).strict();

export const partnerItemSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(1000),
  title: z.string().trim().min(1).max(160),
  media: mediaReferenceSchema,
}).strict();

export const partnersBlockSchema = z.object({
  type: z.literal('partners'),
  ...blockBase,
  heading: z.string().trim().min(1).max(240),
  items: z.array(partnerItemSchema).min(1).max(40),
}).strict();

export const contactBlockSchema = z.object({
  type: z.literal('contact'),
  ...blockBase,
  kicker: z.string().trim().min(1).max(300),
  headingLines: z.array(z.string().trim().min(1).max(160)).min(1).max(4),
  cta: ctaSchema,
  location: z.string().trim().min(1).max(160),
  locationEn: z.string().trim().min(1).max(160).optional(),
  email: z.email().max(254),
  organizationDisplayName: z.string().trim().min(1).max(200),
  copyrightYear: z.number().int().min(2000).max(2200),
}).strict();

export const proseBlockSchema = z.object({
  type: z.literal('prose'),
  ...blockBase,
  paragraphs: z.array(z.string().trim().min(1).max(5000)).min(1).max(30),
}).strict();

export const leadBlockSchema = z.object({
  type: z.literal('lead'),
  ...blockBase,
  text: z.string().trim().min(1).max(2000),
}).strict();

export const contentBlockSchema = z.discriminatedUnion('type', [
  heroBlockSchema,
  aboutBlockSchema,
  capabilitiesBlockSchema,
  motifsBlockSchema,
  jiangnanBlockSchema,
  partnersBlockSchema,
  contactBlockSchema,
  proseBlockSchema,
  leadBlockSchema,
]);
export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const contentDocumentSchema = z.object({
  version: z.literal(CONTENT_CONTRACT_VERSION),
  blocks: z.array(contentBlockSchema).min(1).max(100),
}).strict();

const requiredHomeBlockTypes = ['hero', 'about', 'capabilities', 'motifs', 'jiangnan', 'partners', 'contact'] as const;

export const homeContentDocumentSchema = contentDocumentSchema.superRefine((document, context) => {
  const types = document.blocks.map((block) => block.type);
  for (const type of requiredHomeBlockTypes) {
    const count = types.filter((candidate) => candidate === type).length;
    if (count !== 1) {
      context.addIssue({ code: 'custom', path: ['blocks'], message: `首页必须且只能包含一个 ${type} block` });
    }
  }
});

export type ContentDocument = z.infer<typeof contentDocumentSchema>;
export type HomeContentDocument = z.infer<typeof homeContentDocumentSchema>;

export function parseContentDocument(slug: string, input: unknown): ContentDocument {
  return (slug === 'home' ? homeContentDocumentSchema : contentDocumentSchema).parse(input);
}
