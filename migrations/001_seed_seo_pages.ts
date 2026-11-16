import 'dotenv/config';
import { getAdminDb, checkFirebaseAdminHealth } from '../server/firebaseAdmin.ts';
import {
  auditSeoPages,
  buildCanonicalUrl,
  CANONICAL_ORIGIN,
  DEFAULT_OG_IMAGE_URL,
  DEFAULT_PUBLIC_SEO_PAGES,
} from '../shared/seoEngine.ts';

async function runMigration() {
  const health = await checkFirebaseAdminHealth();
  if (!health.initialized || !health.firestoreAccessOk) {
    throw new Error(
      health.error ||
        'Firebase Admin Firestore access is required to run migration. Set FIREBASE_SERVICE_ACCOUNT_JSON first.'
    );
  }

  const db = getAdminDb();
  const actorUid = 'system-migration';
  const actorEmail = 'system@eprbazaar.com';
  const now = new Date();
  let createdCount = 0;
  let skippedCount = 0;

  for (const page of DEFAULT_PUBLIC_SEO_PAGES) {
    const ref = db.collection('seo_pages').doc(page.id);
    const existing = await ref.get();
    if (existing.exists) {
      skippedCount += 1;
      continue;
    }

    await ref.set({
      id: page.id,
      slug: page.slug,
      pageType: page.pageType,
      pageTitle: page.pageTitle,
      contentSummary: page.contentSummary,
      seoTitle: page.seoTitle || `${page.pageTitle} | ETP – EPR Bazaar`,
      metaDescription: page.metaDescription || page.contentSummary.slice(0, 158),
      canonicalUrl: buildCanonicalUrl(page.slug),
      robots: page.robots || 'index, follow',
      ogTitle: page.ogTitle || page.seoTitle || page.pageTitle,
      ogDescription: page.ogDescription || page.metaDescription || page.contentSummary.slice(0, 158),
      ogImage: page.ogImage || DEFAULT_OG_IMAGE_URL,
      twitterCard: page.twitterCard || 'summary_large_image',
      published: page.published,
      isSystemPage: page.isSystemPage,
      updatedByUid: actorUid,
      createdAt: now,
      updatedAt: now,
    });
    createdCount += 1;
  }

  const allPagesSnap = await db.collection('seo_pages').get();
  const allCatsSnap = await db.collection('categories').where('active', '==', true).get();
  const audit = auditSeoPages(
    allPagesSnap.docs.map((d) => d.data() as (typeof DEFAULT_PUBLIC_SEO_PAGES)[number]),
    allCatsSnap.docs.map((d) => d.data() as { id: string; code: string; name: string; unit: 'MT' | 'KL' | 'Units'; active: boolean })
  );

  await db.collection('seo_settings').doc('default').set(
    {
      id: 'default',
      canonicalDomain: CANONICAL_ORIGIN,
      sitemapStatus: audit.sitemapStatus,
      totalUrls: audit.totalUrlsInSitemap,
      lastRegeneratedByUid: actorUid,
      lastRegeneratedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  const logId = `SEOMIG-${Date.now()}`;
  await db.collection('seo_logs').doc(logId).set({
    id: logId,
    action: 'Seeded',
    pageId: 'migration-001',
    slug: '/sitemap.xml',
    details: `Migration 001 completed: ${createdCount} pages created, ${skippedCount} preserved, ${audit.totalUrlsInSitemap} total URLs.`,
    actorUid,
    actorEmail,
    createdAt: now,
  });

  console.log(
    JSON.stringify({
      ok: true,
      createdCount,
      skippedCount,
      totalUrlsInSitemap: audit.totalUrlsInSitemap,
      sitemapStatus: audit.sitemapStatus,
    })
  );
}

runMigration().catch((err) => {
  console.error('SEO migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
