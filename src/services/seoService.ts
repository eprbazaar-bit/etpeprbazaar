import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  auditSeoPages,
  buildCanonicalUrl,
  CANONICAL_ORIGIN,
  DEFAULT_OG_IMAGE_URL,
  DEFAULT_PUBLIC_SEO_PAGES,
  generateDeterministicSeoDraft,
  isRestrictedPath,
  normalizeSlug,
  SeoPageInput,
} from '../../shared/seoEngine';
import { EPRCategory, SeoChangeLog, SeoPageRecord } from '../types';

function makeSeoLogId(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SEOLOG-${Date.now().toString().slice(-6)}-${rand}`;
}

export function makeSeoPageId(slug: string): string {
  const clean = normalizeSlug(slug)
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `page-${clean || 'home'}`.slice(0, 64);
}

export function toSeoPageInput(p: SeoPageRecord): SeoPageInput {
  let updatedAtIso: string | undefined;
  if (typeof p.updatedAt === 'string') {
    updatedAtIso = p.updatedAt;
  } else if (p.updatedAt && typeof (p.updatedAt as { toDate?: () => Date }).toDate === 'function') {
    updatedAtIso = (p.updatedAt as { toDate: () => Date }).toDate().toISOString();
  }
  return {
    id: p.id,
    slug: p.slug,
    pageType: p.pageType,
    pageTitle: p.pageTitle,
    contentSummary: p.contentSummary,
    seoTitle: p.seoTitle,
    metaDescription: p.metaDescription,
    canonicalUrl: p.canonicalUrl,
    robots: p.robots,
    ogTitle: p.ogTitle,
    ogDescription: p.ogDescription,
    ogImage: p.ogImage,
    twitterCard: p.twitterCard,
    published: p.published,
    isSystemPage: p.isSystemPage,
    updatedAtIso,
  };
}

export async function writeSeoLogDoc(params: {
  action: SeoChangeLog['action'];
  pageId: string;
  slug: string;
  details: string;
  actorUid: string;
  actorEmail: string;
}): Promise<void> {
  const id = makeSeoLogId();
  try {
    await setDoc(doc(db, 'seo_logs', id), {
      id,
      action: params.action,
      pageId: params.pageId.slice(0, 128),
      slug: params.slug.slice(0, 180),
      details: params.details.slice(0, 500),
      actorUid: params.actorUid,
      actorEmail: params.actorEmail.slice(0, 160),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `seo_logs/${id}`);
  }
}

export async function syncSeoSettingsSummaryDoc(params: {
  pages: SeoPageRecord[];
  categories: EPRCategory[];
  actorUid: string;
}): Promise<void> {
  const audit = auditSeoPages(
    params.pages.map(toSeoPageInput),
    params.categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      shortName: c.shortName,
      description: c.description,
      unit: c.unit,
      active: c.active,
    }))
  );
  try {
    await setDoc(
      doc(db, 'seo_settings', 'default'),
      {
        id: 'default',
        canonicalDomain: CANONICAL_ORIGIN,
        sitemapStatus: audit.sitemapStatus,
        totalUrls: audit.totalUrlsInSitemap,
        lastRegeneratedByUid: params.actorUid,
        lastRegeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seo_settings/default');
  }
}

export async function seedInitialSeoPagesIfEmpty(params: {
  actorUid: string;
  actorEmail: string;
  categories: EPRCategory[];
  forceSyncMissing?: boolean;
}): Promise<{ seededCount: number }> {
  const existingSnap = await getDocs(collection(db, 'seo_pages'));
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));
  const pagesToCreate = params.forceSyncMissing
    ? DEFAULT_PUBLIC_SEO_PAGES.filter((p) => !existingIds.has(p.id))
    : existingSnap.empty
      ? DEFAULT_PUBLIC_SEO_PAGES
      : [];

  if (pagesToCreate.length === 0) {
    return { seededCount: 0 };
  }

  const batch = writeBatch(db);
  for (const page of pagesToCreate) {
    const draft = generateDeterministicSeoDraft({
      pageTitle: page.pageTitle,
      slug: page.slug,
      contentSummary: page.contentSummary,
    });
    batch.set(doc(db, 'seo_pages', page.id), {
      id: page.id,
      slug: page.slug,
      pageType: page.pageType,
      pageTitle: page.pageTitle.slice(0, 140),
      contentSummary: page.contentSummary.slice(0, 1500),
      seoTitle: (page.seoTitle || draft.seoTitle).slice(0, 120),
      metaDescription: (page.metaDescription || draft.metaDescription).slice(0, 320),
      canonicalUrl: (page.canonicalUrl || draft.canonicalUrl).slice(0, 260),
      robots: page.robots || 'index, follow',
      ogTitle: (page.ogTitle || page.seoTitle || draft.seoTitle).slice(0, 120),
      ogDescription: (page.ogDescription || page.metaDescription || draft.metaDescription).slice(0, 320),
      ogImage: (page.ogImage || DEFAULT_OG_IMAGE_URL).slice(0, 400),
      twitterCard: page.twitterCard || 'summary_large_image',
      published: page.published,
      isSystemPage: page.isSystemPage,
      updatedByUid: params.actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seo_pages');
  }

  const allSnap = await getDocs(collection(db, 'seo_pages'));
  const allPages = allSnap.docs.map((d) => d.data() as SeoPageRecord);
  await syncSeoSettingsSummaryDoc({
    pages: allPages,
    categories: params.categories,
    actorUid: params.actorUid,
  });

  await writeSeoLogDoc({
    action: 'Seeded',
    pageId: 'default-catalog',
    slug: '/',
    details: `Synchronized ${pagesToCreate.length} core/legal public page metadata records.`,
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
  });

  return { seededCount: pagesToCreate.length };
}

export async function saveSeoPageDoc(params: {
  id?: string;
  slug: string;
  pageType: 'core' | 'legal' | 'custom';
  pageTitle: string;
  contentSummary: string;
  seoTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robots?: 'index, follow' | 'noindex, nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary_large_image' | 'summary';
  published: boolean;
  isSystemPage?: boolean;
  aiDraftSeoTitle?: string;
  aiDraftMetaDescription?: string;
  aiDraftApproved?: boolean;
  actorUid: string;
  actorEmail: string;
}): Promise<{ id: string; isNew: boolean }> {
  const cleanSlug = normalizeSlug(params.slug);
  if (isRestrictedPath(cleanSlug)) {
    throw new Error(`Slug "${cleanSlug}" belongs to a protected/restricted route and cannot be published as a public page.`);
  }

  const cleanTitle = params.pageTitle.trim();
  const cleanSummary = params.contentSummary.trim();
  if (cleanTitle.length < 2) {
    throw new Error('Page title must be at least 2 characters.');
  }
  if (cleanSummary.length < 10) {
    throw new Error('Content summary must be at least 10 characters so metadata can be verified.');
  }

  const fallback = generateDeterministicSeoDraft({
    pageTitle: cleanTitle,
    slug: cleanSlug,
    contentSummary: cleanSummary,
  });

  const pageId = params.id || makeSeoPageId(cleanSlug);
  const pageRef = doc(db, 'seo_pages', pageId);
  const existingSnap = await getDoc(pageRef);

  const canonical = (params.canonicalUrl || '').trim() || buildCanonicalUrl(cleanSlug);
  const finalSeoTitle = (params.seoTitle ?? '').trim();
  const finalMetaDesc = (params.metaDescription ?? '').trim();
  const robots: 'index, follow' | 'noindex, nofollow' = params.published
    ? params.robots || 'index, follow'
    : 'noindex, nofollow';

  const basePayload: Record<string, unknown> = {
    id: pageId,
    slug: cleanSlug.slice(0, 180),
    pageType: existingSnap.exists() ? (existingSnap.data() as SeoPageRecord).pageType : params.pageType,
    pageTitle: cleanTitle.slice(0, 140),
    contentSummary: cleanSummary.slice(0, 1500),
    seoTitle: (finalSeoTitle || (params.id ? '' : fallback.seoTitle)).slice(0, 120),
    metaDescription: (finalMetaDesc || (params.id ? '' : fallback.metaDescription)).slice(0, 320),
    canonicalUrl: canonical.slice(0, 260),
    robots,
    ogTitle: ((params.ogTitle || '').trim() || finalSeoTitle || fallback.ogTitle).slice(0, 120),
    ogDescription: ((params.ogDescription || '').trim() || finalMetaDesc || fallback.ogDescription).slice(0, 320),
    ogImage: ((params.ogImage || '').trim() || DEFAULT_OG_IMAGE_URL).slice(0, 400),
    twitterCard: params.twitterCard || 'summary_large_image',
    published: Boolean(params.published),
    isSystemPage: existingSnap.exists()
      ? (existingSnap.data() as SeoPageRecord).isSystemPage
      : Boolean(params.isSystemPage),
    updatedByUid: params.actorUid,
    updatedAt: serverTimestamp(),
  };

  if (params.aiDraftSeoTitle !== undefined) {
    basePayload.aiDraftSeoTitle = params.aiDraftSeoTitle.slice(0, 120);
  }
  if (params.aiDraftMetaDescription !== undefined) {
    basePayload.aiDraftMetaDescription = params.aiDraftMetaDescription.slice(0, 320);
  }
  if (params.aiDraftApproved !== undefined) {
    basePayload.aiDraftApproved = Boolean(params.aiDraftApproved);
  }

  try {
    if (existingSnap.exists()) {
      await updateDoc(pageRef, basePayload);
      await writeSeoLogDoc({
        action: 'Edited',
        pageId,
        slug: cleanSlug,
        details: `Updated metadata (${params.published ? 'Published / indexable' : 'Unpublished / noindex'}).`,
        actorUid: params.actorUid,
        actorEmail: params.actorEmail,
      });
      return { id: pageId, isNew: false };
    }

    await setDoc(pageRef, {
      ...basePayload,
      createdAt: serverTimestamp(),
    });
    await writeSeoLogDoc({
      action: 'Published',
      pageId,
      slug: cleanSlug,
      details: `Created public SEO page "${cleanTitle}" (${params.published ? 'Published' : 'Draft'}).`,
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
    });
    return { id: pageId, isNew: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `seo_pages/${pageId}`);
  }
}

export async function toggleSeoPagePublishDoc(params: {
  page: SeoPageRecord;
  published: boolean;
  actorUid: string;
  actorEmail: string;
}): Promise<void> {
  try {
    await updateDoc(doc(db, 'seo_pages', params.page.id), {
      published: params.published,
      robots: params.published ? 'index, follow' : 'noindex, nofollow',
      updatedByUid: params.actorUid,
      updatedAt: serverTimestamp(),
    });
    await writeSeoLogDoc({
      action: params.published ? 'Published' : 'Unpublished',
      pageId: params.page.id,
      slug: params.page.slug,
      details: params.published
        ? `Published ${params.page.slug} and included canonical URL in sitemap.`
        : `Unpublished ${params.page.slug} and excluded from sitemap (noindex).`,
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `seo_pages/${params.page.id}`);
  }
}

export async function deleteSeoPageDoc(params: {
  page: SeoPageRecord;
  actorUid: string;
  actorEmail: string;
}): Promise<void> {
  if (params.page.isSystemPage) {
    throw new Error('Core platform pages cannot be deleted; unpublish them instead.');
  }
  try {
    await deleteDoc(doc(db, 'seo_pages', params.page.id));
    await writeSeoLogDoc({
      action: 'Deleted',
      pageId: params.page.id,
      slug: params.page.slug,
      details: `Deleted custom public page ${params.page.slug} and removed from sitemap.`,
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `seo_pages/${params.page.id}`);
  }
}

export async function regenerateSitemapApi(idToken: string): Promise<{
  ok: boolean;
  lastUpdatedIso?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/seo/regenerate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as { ok: boolean; lastUpdatedIso?: string; error?: string };
    return data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to refresh sitemap index.',
    };
  }
}

export async function requestSeoSuggestionApi(
  idToken: string,
  input: {
    pageTitle: string;
    slug: string;
    contentSummary: string;
    existingTitles: string[];
  }
): Promise<{
  ok: boolean;
  aiDraftSeoTitle?: string;
  aiDraftMetaDescription?: string;
  usedAi?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch('/api/seo/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as {
      ok: boolean;
      aiDraftSeoTitle?: string;
      aiDraftMetaDescription?: string;
      usedAi?: boolean;
      error?: string;
    };
    return data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to generate metadata suggestion.',
    };
  }
}
