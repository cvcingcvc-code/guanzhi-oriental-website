import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

export const userRole = pgEnum('user_role', ['ADMIN', 'EDITOR']);
export const pageStatus = pgEnum('page_status', ['DRAFT', 'PUBLISHED']);
export const inquiryStatus = pgEnum('inquiry_status', ['NEW', 'CONTACTED', 'NEGOTIATING', 'WON', 'CLOSED']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 80 }).notNull(),
  role: userRole('role').notNull().default('EDITOR'),
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex('users_email_unique').on(sql`lower(${table.email})`)]);

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  status: pageStatus('status').notNull().default('DRAFT'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const pageTranslations = pgTable('page_translations', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  locale: varchar('locale', { length: 10 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  seoTitle: varchar('seo_title', { length: 200 }),
  seoDescription: varchar('seo_description', { length: 500 }),
  blocks: jsonb('blocks').notNull().default([]),
  ...timestamps,
}, (table) => [uniqueIndex('page_translations_page_locale_unique').on(table.pageId, table.locale)]);

export const pageRevisions = pgTable('page_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('page_revisions_page_revision_unique').on(table.pageId, table.revision)]);

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  storageKey: varchar('storage_key', { length: 500 }).notNull().unique(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  altZh: varchar('alt_zh', { length: 300 }),
  altEn: varchar('alt_en', { length: 300 }),
  category: varchar('category', { length: 80 }),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [index('media_assets_category_idx').on(table.category)]);

export const inquiries = pgTable('inquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 80 }).notNull(),
  organization: varchar('organization', { length: 160 }).notNull(),
  jobTitle: varchar('job_title', { length: 80 }),
  email: varchar('email', { length: 254 }).notNull(),
  contact: varchar('contact', { length: 100 }),
  intent: varchar('intent', { length: 50 }).notNull(),
  message: text('message'),
  locale: varchar('locale', { length: 10 }).notNull().default('zh-CN'),
  sourceUrl: varchar('source_url', { length: 1000 }),
  status: inquiryStatus('status').notNull().default('NEW'),
  ipHash: varchar('ip_hash', { length: 64 }),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (table) => [
  index('inquiries_status_created_idx').on(table.status, table.createdAt),
  index('inquiries_email_idx').on(table.email),
]);

export const inquiryNotes = pgTable('inquiry_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  inquiryId: uuid('inquiry_id').notNull().references(() => inquiries.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const siteSettings = pgTable('site_settings', {
  key: varchar('key', { length: 120 }).primaryKey(),
  value: jsonb('value').notNull(),
  description: varchar('description', { length: 300 }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 80 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: varchar('entity_id', { length: 120 }),
  before: jsonb('before'),
  after: jsonb('after'),
  ipHash: varchar('ip_hash', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('audit_logs_entity_idx').on(table.entityType, table.entityId)]);

export const pageRelations = relations(pages, ({ many }) => ({ translations: many(pageTranslations), revisions: many(pageRevisions) }));
export const pageTranslationRelations = relations(pageTranslations, ({ one }) => ({ page: one(pages, { fields: [pageTranslations.pageId], references: [pages.id] }) }));
export const inquiryRelations = relations(inquiries, ({ many }) => ({ notes: many(inquiryNotes) }));
