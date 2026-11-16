import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import type { Firestore } from 'firebase-admin/firestore';
import {
  auditSeoPages,
  buildCanonicalUrl,
  CANONICAL_ORIGIN,
  DEFAULT_PUBLIC_SEO_PAGES,
  escapeXml,
  generateDeterministicSeoDraft,
  getIndexableCategoryEntries,
  getIndexableSitemapPageEntries,
  isRestrictedPath,
  normalizeSlug,
  renderRobotsTxt,
  renderSitemapIndexXml,
  renderUrlSetXml,
  resolveMetadataForPath,
} from '../shared/seoEngine.ts';
import type {
  CategorySeoInput,
  ResolvedSeoMetadata,
  SeoAuditReport,
  SeoPageInput,
} from '../shared/seoEngine.ts';
import { getAdminDb, getFirebaseAdminState } from './firebaseAdmin.ts';

export interface SeoCatalogSnapshot {
  pages: SeoPageInput[];
  categories: CategorySeoInput[];
  audit: SeoAuditReport;
  lastUpdatedIso: string;
  source: 'firestore-admin' | 'firestore-rest' | 'defaults' | 'custom';
  cachedAt: number;
}

export interface SeoDataStore {
  listSeoPages: () => Promise<SeoPageInput[]>;
  listActiveCategories: () => Promise<CategorySeoInput[]>;
  getLastUpdatedIso: () => Promise<string | null>;
  isAdminUser: (uid: string, email?: string) => Promise<boolean>;
  recordRegeneration?: (params: {
    actorUid: string;
    actorEmail: string;
    totalUrls: number;
    status: 'Healthy' | 'Needs Attention';
  }) => Promise<void>;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'ajaykumartiwari609@gmail.com';
const CACHE_TTL_MS = 60 * 1000;

let cachedSnapshot: SeoCatalogSnapshot | null = null;

export function invalidateSeoCache(): void {
  cachedSnapshot = null;
}

function loadAppletConfig(): { projectId: string; firestoreDatabaseId: string } {
  const raw = fs.readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8');
  return JSON.parse(raw) as { projectId: string; firestoreDatabaseId: string };
}

function firestoreTimestampToIso(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function parseFirestoreRestField(field: Record<string, unknown> | undefined): unknown {
  if (!field) return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('timestampValue' in field) return field.timestampValue;
  return undefined;
}

function parseRestDocFields(fields: Record<string, Record<string, unknown>> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!fields) return out;
  for (const [k, v] of Object.entries(fields)) {
    out[k] = parseFirestoreRestField(v);
  }
  return out;
}

function mapRawSeoPage(docId: string, data: Record<string, unknown>): SeoPageInput {
  const slug = normalizeSlug(String(data.slug || '/'));
  return {
    id: String(data.id || docId),
    slug,
    pageType:
      data.pageType === 'legal' || data.pageType === 'custom' ? data.pageType : 'core',
    pageTitle: String(data.pageTitle || 'ETP – EPR Bazaar'),
    contentSummary: String(data.contentSummary || ''),
    seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : undefined,
    metaDescription: typeof data.metaDescription === 'string' ? data.metaDescription : undefined,
    canonicalUrl:
      typeof data.canonicalUrl === 'string' && data.canonicalUrl
        ? data.canonicalUrl
        : buildCanonicalUrl(slug),
    robots: data.robots === 'noindex, nofollow' ? 'noindex, nofollow' : 'index, follow',
    ogTitle: typeof data.ogTitle === 'string' ? data.ogTitle : undefined,
    ogDescription: typeof data.ogDescription === 'string' ? data.ogDescription : undefined,
    ogImage: typeof data.ogImage === 'string' ? data.ogImage : undefined,
    twitterCard: data.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
    published: data.published !== false,
    isSystemPage: Boolean(data.isSystemPage),
    updatedAtIso:
      firestoreTimestampToIso(data.updatedAt) || firestoreTimestampToIso(data.createdAt),
  };
}

function mapRawCategory(docId: string, data: Record<string, unknown>): CategorySeoInput {
  return {
    id: String(data.id || docId),
    code: String(data.code || docId),
    name: String(data.name || 'EPR Category'),
    shortName: typeof data.shortName === 'string' ? data.shortName : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    unit:
      data.unit === 'KL' || data.unit === 'Units' ? data.unit : 'MT',
    active: data.active !== false,
    updatedAtIso: firestoreTimestampToIso(data.updatedAt) || firestoreTimestampToIso(data.createdAt),
  };
}

async function fetchPublicRestCollection(collectionName: string): Promise<Record<string, unknown>[]> {
  const cfg = loadAppletConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    cfg.projectId
  )}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents:runQuery`;

  const structuredQuery =
    collectionName === 'seo_pages'
      ? {
          from: [{ collectionId: 'seo_pages' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'published' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
          limit: 500,
        }
      : {
          from: [{ collectionId: 'categories' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'active' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
          limit: 200,
        };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      document?: { name: string; fields?: Record<string, Record<string, unknown>> };
    }>;
    return rows
      .filter((r) => Boolean(r.document))
      .map((r) => {
        const docName = r.document!.name || '';
        const docId = docName.split('/').pop() || '';
        return {
          __docId: docId,
          ...parseRestDocFields(r.document!.fields),
        };
      });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function createFirestoreSeoStore(db: Firestore): SeoDataStore {
  return {
    listSeoPages: async () => {
      const snap = await db.collection('seo_pages').get();
      return snap.docs.map((d) => mapRawSeoPage(d.id, d.data() as Record<string, unknown>));
    },
    listActiveCategories: async () => {
      const snap = await db.collection('categories').where('active', '==', true).get();
      return snap.docs.map((d) => mapRawCategory(d.id, d.data() as Record<string, unknown>));
    },
    getLastUpdatedIso: async () => {
      const snap = await db.collection('seo_settings').doc('default').get();
      if (!snap.exists) return null;
      const d = snap.data() as Record<string, unknown>;
      return firestoreTimestampToIso(d.lastRegeneratedAt) || firestoreTimestampToIso(d.updatedAt) || null;
    },
    isAdminUser: async (uid: string, email?: string) => {
      if ((email || '').trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL) return true;
      const adminSnap = await db.collection('admins').doc(uid).get();
      return adminSnap.exists && (adminSnap.data() as { status?: string })?.status === 'Active';
    },
    recordRegeneration: async ({ actorUid, actorEmail, totalUrls, status }) => {
      const now = new Date();
      await db
        .collection('seo_settings')
        .doc('default')
        .set(
          {
            id: 'default',
            canonicalDomain: CANONICAL_ORIGIN,
            sitemapStatus: status,
            totalUrls,
            lastRegeneratedByUid: actorUid,
            lastRegeneratedAt: now,
            updatedAt: now,
          },
          { merge: true }
        );
      const logId = `SEOLOG-${Date.now()}`;
      await db.collection('seo_logs').doc(logId).set({
        id: logId,
        action: 'Sitemap Regenerated',
        pageId: 'sitemap-index',
        slug: '/sitemap.xml',
        details: `Manual sitemap regeneration completed (${totalUrls} indexable URLs).`,
        actorUid,
        actorEmail,
        createdAt: now,
      });
    },
  };
}

export async function loadSeoCatalogSnapshot(options?: {
  customStore?: SeoDataStore;
  forceRefresh?: boolean;
}): Promise<SeoCatalogSnapshot> {
  if (!options?.forceRefresh && cachedSnapshot && Date.now() - cachedSnapshot.cachedAt < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  let pages: SeoPageInput[] = [];
  let categories: CategorySeoInput[] = [];
  let lastUpdatedIso = new Date().toISOString();
  let source: SeoCatalogSnapshot['source'] = 'defaults';

  if (options?.customStore) {
    pages = await options.customStore.listSeoPages();
    categories = await options.customStore.listActiveCategories();
    lastUpdatedIso = (await options.customStore.getLastUpdatedIso()) || lastUpdatedIso;
    source = 'custom';
  } else {
    const adminState = getFirebaseAdminState();
    let adminLoaded = false;

    if (adminState.initialized) {
      try {
        const store = createFirestoreSeoStore(getAdminDb());
        const [rawPages, rawCats, settingIso] = await Promise.all([
          store.listSeoPages(),
          store.listActiveCategories(),
          store.getLastUpdatedIso(),
        ]);
        pages = rawPages;
        categories = rawCats;
        if (settingIso) lastUpdatedIso = settingIso;
        source = 'firestore-admin';
        adminLoaded = true;
      } catch {
        adminLoaded = false;
      }
    }

    if (!adminLoaded) {
      try {
        const [restPages, restCats] = await Promise.all([
          fetchPublicRestCollection('seo_pages'),
          fetchPublicRestCollection('categories'),
        ]);
        if (restPages.length > 0) {
          pages = restPages.map((d) => mapRawSeoPage(String(d.__docId || ''), d));
          source = 'firestore-rest';
        }
        if (restCats.length > 0) {
          categories = restCats.map((d) => mapRawCategory(String(d.__docId || ''), d));
        }
      } catch {
        // Fallback below
      }
    }
  }

  // Only fall back to curated core defaults when no custom store supplied an explicit dataset
  // and Firestore has not yet been seeded with seo_pages.
  if (pages.length === 0 && !options?.customStore) {
    const today = new Date().toISOString().slice(0, 10);
    pages = DEFAULT_PUBLIC_SEO_PAGES.map((p) => ({
      ...p,
      updatedAtIso: p.updatedAtIso || today,
    }));
    source = 'defaults';
  }

  const audit = auditSeoPages(pages, categories);
  const snapshot: SeoCatalogSnapshot = {
    pages,
    categories,
    audit,
    lastUpdatedIso,
    source,
    cachedAt: Date.now(),
  };

  if (!options?.customStore) {
    cachedSnapshot = snapshot;
  }

  return snapshot;
}

export function generateSitemapIndexFromSnapshot(
  snapshot: SeoCatalogSnapshot,
  origin = CANONICAL_ORIGIN
): string {
  const cleanOrigin = buildCanonicalUrl('/', origin).replace(/\/$/, '');
  const lastmod = snapshot.lastUpdatedIso.slice(0, 10);
  const sitemaps: { loc: string; lastmod: string }[] = [
    {
      loc: `${cleanOrigin}/sitemap-pages.xml`,
      lastmod,
    },
  ];
  const categoryItems = getIndexableCategoryEntries(snapshot.categories, cleanOrigin);
  if (categoryItems.length > 0) {
    sitemaps.push({
      loc: `${cleanOrigin}/sitemap-categories.xml`,
      lastmod,
    });
  }
  return renderSitemapIndexXml(sitemaps);
}

export function generatePagesSitemapFromSnapshot(
  snapshot: SeoCatalogSnapshot,
  origin = CANONICAL_ORIGIN
): string {
  const items = getIndexableSitemapPageEntries(snapshot.pages, origin);
  return renderUrlSetXml(items);
}

export function generateCategoriesSitemapFromSnapshot(
  snapshot: SeoCatalogSnapshot,
  origin = CANONICAL_ORIGIN
): string {
  const items = getIndexableCategoryEntries(snapshot.categories, origin);
  return renderUrlSetXml(items);
}

export function generateSitemapXml(baseUrl = CANONICAL_ORIGIN, lastmod?: string): string {
  const items = getIndexableSitemapPageEntries(
    DEFAULT_PUBLIC_SEO_PAGES.map((p) => ({ ...p, updatedAtIso: lastmod })),
    baseUrl
  );
  return renderUrlSetXml(items);
}

export function generateRobotsTxt(baseUrl = CANONICAL_ORIGIN): string {
  return renderRobotsTxt(baseUrl);
}

function escapeAttr(val: string): string {
  return escapeXml(val);
}

export function resolveHtmlRouteMetadata(
  reqPath: string,
  snapshot: SeoCatalogSnapshot
): ResolvedSeoMetadata {
  const cleanSlug = normalizeSlug(reqPath);
  return resolveMetadataForPath(cleanSlug, snapshot.pages, snapshot.categories);
}

export function injectSeoIntoHtml(
  html: string,
  reqPath: string,
  snapshot: SeoCatalogSnapshot
): string {
  const meta = resolveHtmlRouteMetadata(reqPath, snapshot);
  const titleTag = `<title>${escapeXml(meta.seoTitle)}</title>`;
  const seoHeadBlock = [
    `<meta name="description" content="${escapeAttr(meta.metaDescription)}" />`,
    `<meta name="robots" content="${escapeAttr(meta.robots)}" />`,
    `<link rel="canonical" href="${escapeAttr(meta.canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.ogDescription)}" />`,
    `<meta property="og:type" content="${escapeAttr(meta.ogType)}" />`,
    `<meta property="og:url" content="${escapeAttr(meta.canonicalUrl)}" />`,
    `<meta property="og:site_name" content="${escapeAttr(meta.ogSiteName)}" />`,
    `<meta property="og:image" content="${escapeAttr(meta.ogImage)}" />`,
    `<meta name="twitter:card" content="${escapeAttr(meta.twitterCard)}" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.twitterTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.twitterDescription)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(meta.twitterImage)}" />`,
    ...(meta.structuredData.length > 0
      ? [
          `<script id="epr-seo-jsonld" type="application/ld+json">${JSON.stringify(
            meta.structuredData.length === 1 ? meta.structuredData[0] : meta.structuredData
          )}</script>`,
        ]
      : []),
  ].join('\n    ');

  let updated = html;
  updated = updated.replace(/<title>[\s\S]*?<\/title>/i, () => titleTag);
  // Remove static duplicates before injecting authoritative route-specific tags
  updated = updated
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<script[^>]+id=["']epr-seo-jsonld["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');

  updated = updated.replace('</head>', () => `    ${seoHeadBlock}\n  </head>`);
  return updated;
}

export async function generateAdminSeoSuggestion(input: {
  pageTitle: string;
  slug: string;
  contentSummary: string;
  existingTitles: string[];
}): Promise<{
  aiDraftSeoTitle: string;
  aiDraftMetaDescription: string;
  usedAi: boolean;
  approved: false;
}> {
  const fallback = generateDeterministicSeoDraft(input);
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      aiDraftSeoTitle: fallback.seoTitle,
      aiDraftMetaDescription: fallback.metaDescription,
      usedAi: false,
      approved: false,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = [
      'Generate an unapproved SEO draft title and meta description for an Indian B2B EPR credit trading webpage.',
      `Page Name: ${input.pageTitle}`,
      `URL Slug: ${input.slug}`,
      `Content Summary: ${input.contentSummary}`,
      `Avoid duplicating these existing titles: ${input.existingTitles.slice(0, 20).join(' | ')}`,
      'Requirements: Title 45-62 chars ending with "| ETP – EPR Bazaar". Description 125-155 chars, factual business tone.',
      'Return valid JSON strictly matching {"seoTitle": "...", "metaDescription": "..."}.',
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const text = (response.text || '').trim();
    const parsed = JSON.parse(text) as { seoTitle?: string; metaDescription?: string };
    const cleanTitle = (parsed.seoTitle || '').trim();
    const cleanDesc = (parsed.metaDescription || '').trim();
    if (cleanTitle.length >= 20 && cleanDesc.length >= 50) {
      return {
        aiDraftSeoTitle: cleanTitle.slice(0, 120),
        aiDraftMetaDescription: cleanDesc.slice(0, 320),
        usedAi: true,
        approved: false,
      };
    }
  } catch {
    // Graceful deterministic fallback
  }

  return {
    aiDraftSeoTitle: fallback.seoTitle,
    aiDraftMetaDescription: fallback.metaDescription,
    usedAi: false,
    approved: false,
  };
}
