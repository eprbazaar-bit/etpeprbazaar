import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiApp } from '../server.ts';
import type { SeoDataStore } from '../server/seoRoutes.ts';
import { injectSeoIntoHtml, invalidateSeoCache, loadSeoCatalogSnapshot } from '../server/seoRoutes.ts';
import {
  auditSeoPages,
  buildCanonicalUrl,
  CANONICAL_ORIGIN,
  DEFAULT_PUBLIC_SEO_PAGES,
  normalizeSlug,
  validateCanonicalUrl,
} from '../shared/seoEngine.ts';
import type { CategorySeoInput, SeoPageInput } from '../shared/seoEngine.ts';

function startTestServer(store: SeoDataStore) {
  let regenCount = 0;
  const wrappedStore: SeoDataStore = {
    ...store,
    recordRegeneration: async (params) => {
      regenCount += 1;
      await store.recordRegeneration?.(params);
    },
  };
  const app = createApiApp({
    getSeoStore: () => wrappedStore,
    verifyToken: async (authHeader) => {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const err = new Error('Missing token') as Error & { statusCode?: number };
        err.statusCode = 401;
        throw err;
      }
      const token = authHeader.slice('Bearer '.length).trim();
      if (token === 'admin-token') {
        return { uid: 'admin-1', email: 'ajaykumartiwari609@gmail.com' };
      }
      return { uid: 'buyer-1', email: 'buyer@company.com' };
    },
  });

  const server = http.createServer(app);
  return {
    server,
    getRegenCount: () => regenCount,
    listen: () =>
      new Promise<string>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          if (addr && typeof addr !== 'string') {
            resolve(`http://127.0.0.1:${addr.port}`);
          }
        });
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

describe('ETP EPR Bazaar Phase 1 SEO System', () => {
  it('serves dynamic sitemap index, pages sitemap, and categories sitemap while excluding private/unpublished routes', async () => {
    invalidateSeoCache();

    const pages: SeoPageInput[] = [
      ...DEFAULT_PUBLIC_SEO_PAGES.slice(0, 4).map((p) => ({
        ...p,
        updatedAtIso: '2026-11-15',
      })),
      {
        id: 'page-custom-published',
        slug: '/plastic-epr-guide',
        pageType: 'custom',
        pageTitle: 'Plastic EPR Compliance Guide',
        contentSummary: 'Comprehensive compliance guide for PIBOs and plastic recyclers across India.',
        seoTitle: 'Plastic EPR Compliance Guide | ETP – EPR Bazaar',
        metaDescription: 'Understand Plastic Cat I-IV EPR target fulfillment and credit procurement on EPR Bazaar.',
        canonicalUrl: `${CANONICAL_ORIGIN}/plastic-epr-guide`,
        robots: 'index, follow',
        published: true,
        isSystemPage: false,
        updatedAtIso: '2026-11-16',
      },
      {
        id: 'page-custom-unpublished',
        slug: '/draft-internal-notes',
        pageType: 'custom',
        pageTitle: 'Unpublished Draft Guide',
        contentSummary: 'Draft page not yet published for public search indexing.',
        seoTitle: 'Draft Internal Notes | ETP – EPR Bazaar',
        metaDescription: 'Draft notes that must remain excluded from sitemap.xml.',
        canonicalUrl: `${CANONICAL_ORIGIN}/draft-internal-notes`,
        robots: 'noindex, nofollow',
        published: false,
        isSystemPage: false,
        updatedAtIso: '2026-11-16',
      },
      {
        id: 'page-forbidden-login',
        slug: '/login',
        pageType: 'custom',
        pageTitle: 'Login',
        contentSummary: 'Login page must never appear in sitemap.',
        seoTitle: 'Login | ETP – EPR Bazaar',
        metaDescription: 'Login page',
        canonicalUrl: `${CANONICAL_ORIGIN}/login`,
        robots: 'index, follow',
        published: true,
        isSystemPage: false,
      },
      {
        id: 'page-duplicate-home',
        slug: '/',
        pageType: 'core',
        pageTitle: 'Duplicate Home',
        contentSummary: 'Duplicate entry to verify URL deduplication in sitemap output.',
        seoTitle: 'Duplicate Home',
        metaDescription: 'Duplicate Home',
        canonicalUrl: `${CANONICAL_ORIGIN}/`,
        robots: 'index, follow',
        published: true,
        isSystemPage: false,
      },
    ];

    const categories: CategorySeoInput[] = [
      {
        id: 'cat-plastic',
        code: 'PWM-01',
        name: 'Plastic Packaging EPR',
        unit: 'MT',
        active: true,
        updatedAtIso: '2026-11-15',
      },
      {
        id: 'cat-inactive',
        code: 'OLD-99',
        name: 'Archived Waste Category',
        unit: 'MT',
        active: false,
        updatedAtIso: '2026-11-10',
      },
    ];

    const srv = startTestServer({
      listSeoPages: async () => pages,
      listActiveCategories: async () => categories.filter((c) => c.active),
      getLastUpdatedIso: async () => '2026-11-16T09:00:00.000Z',
      isAdminUser: async (_uid, email) => email === 'ajaykumartiwari609@gmail.com',
    });

    const baseUrl = await srv.listen();
    try {
      const indexRes = await fetch(`${baseUrl}/sitemap.xml`);
      assert.equal(indexRes.status, 200);
      assert.match(indexRes.headers.get('content-type') || '', /application\/xml/i);
      const indexXml = await indexRes.text();
      assert.match(indexXml, /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
      assert.ok(indexXml.includes('<loc>https://etp.eprbazaar.com/sitemap-pages.xml</loc>'));
      assert.ok(indexXml.includes('<loc>https://etp.eprbazaar.com/sitemap-categories.xml</loc>'));
      assert.ok(indexXml.includes('<lastmod>2026-11-16</lastmod>'));

      const pagesRes = await fetch(`${baseUrl}/sitemap-pages.xml`);
      assert.equal(pagesRes.status, 200);
      assert.match(pagesRes.headers.get('content-type') || '', /application\/xml/i);
      const pagesXml = await pagesRes.text();
      assert.ok(pagesXml.includes('<loc>https://etp.eprbazaar.com/</loc>'));
      assert.ok(pagesXml.includes('<loc>https://etp.eprbazaar.com/plastic-epr-guide</loc>'));
      assert.ok(!pagesXml.includes('/draft-internal-notes'), 'Unpublished page must be excluded');
      assert.ok(!pagesXml.includes('/login'), 'Login must be excluded');
      assert.ok(!pagesXml.includes('/admin'), 'Admin must be excluded');
      // Deduplicated root URL appears only once
      assert.equal(pagesXml.match(/<loc>https:\/\/etp\.eprbazaar\.com\/<\/loc>/g)?.length, 1);

      const catRes = await fetch(`${baseUrl}/sitemap-categories.xml`);
      assert.equal(catRes.status, 200);
      const catXml = await catRes.text();
      assert.ok(catXml.includes('<loc>https://etp.eprbazaar.com/category/cat-plastic</loc>'));
      assert.ok(!catXml.includes('cat-inactive'));
    } finally {
      await srv.close();
    }
  });

  it('serves compliant robots.txt blocking private portals while allowing public pages and assets', async () => {
    invalidateSeoCache();
    const srv = startTestServer({
      listSeoPages: async () => DEFAULT_PUBLIC_SEO_PAGES,
      listActiveCategories: async () => [],
      getLastUpdatedIso: async () => null,
      isAdminUser: async () => false,
    });
    const baseUrl = await srv.listen();
    try {
      const res = await fetch(`${baseUrl}/robots.txt`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') || '', /text\/plain/i);
      const txt = await res.text();
      assert.ok(txt.includes('Allow: /'));
      assert.ok(txt.includes('Allow: /assets/'));
      assert.ok(txt.includes('Disallow: /api/'));
      assert.ok(txt.includes('Disallow: /admin'));
      assert.ok(txt.includes('Disallow: /buyer'));
      assert.ok(txt.includes('Disallow: /seller'));
      assert.ok(txt.includes('Disallow: /facilitator'));
      assert.ok(txt.includes('Disallow: /login'));
      assert.ok(txt.includes('Sitemap: https://etp.eprbazaar.com/sitemap.xml'));
    } finally {
      await srv.close();
    }
  });

  it('normalizes and validates canonical URLs consistently without query params or trailing slashes', () => {
    assert.equal(normalizeSlug('/Marketplace///?utm=123#top'), '/marketplace');
    assert.equal(buildCanonicalUrl('/market-rates/'), 'https://etp.eprbazaar.com/market-rates');
    assert.equal(buildCanonicalUrl('/'), 'https://etp.eprbazaar.com/');

    assert.equal(validateCanonicalUrl('https://etp.eprbazaar.com/marketplace', '/marketplace').valid, true);
    assert.equal(validateCanonicalUrl('http://etp.eprbazaar.com/marketplace', '/marketplace').valid, false);
    assert.equal(validateCanonicalUrl('https://other.example.com/marketplace', '/marketplace').valid, false);
    assert.equal(validateCanonicalUrl('https://etp.eprbazaar.com/marketplace/', '/marketplace').valid, false);
    assert.equal(validateCanonicalUrl('https://etp.eprbazaar.com/marketplace?ref=1', '/marketplace').valid, false);
  });

  it('injects route-specific meta tags, canonical link, OG/Twitter tags, JSON-LD, and forces noindex on restricted routes', async () => {
    invalidateSeoCache();
    const store: SeoDataStore = {
      listSeoPages: async () => DEFAULT_PUBLIC_SEO_PAGES,
      listActiveCategories: async () => [
        {
          id: 'cat-ewaste',
          code: 'EWM-02',
          name: 'E-Waste EPR Credits',
          description: 'Verified e-waste compliance certificates for electronic producers.',
          unit: 'MT',
          active: true,
        },
      ],
      getLastUpdatedIso: async () => '2026-11-15T12:00:00Z',
      isAdminUser: async () => true,
    };
    const snapshot = await loadSeoCatalogSnapshot({ customStore: store });
    const baseHtml =
      '<!doctype html><html><head><title>Old</title><meta name="description" content="Old" /><link rel="canonical" href="https://old.example" /></head><body><div id="root"></div></body></html>';

    const homeHtml = injectSeoIntoHtml(baseHtml, '/', snapshot);
    assert.ok(homeHtml.includes('<link rel="canonical" href="https://etp.eprbazaar.com/" />'));
    assert.ok(homeHtml.includes('<meta name="robots" content="index, follow" />'));
    assert.ok(homeHtml.includes('<script id="epr-seo-jsonld" type="application/ld+json">'));
    assert.equal(homeHtml.match(/<link[^>]+rel="canonical"/g)?.length, 1);

    const catHtml = injectSeoIntoHtml(baseHtml, '/category/cat-ewaste', snapshot);
    assert.ok(catHtml.includes('E-Waste EPR Credits (EWM-02)'));
    assert.ok(catHtml.includes('<link rel="canonical" href="https://etp.eprbazaar.com/category/cat-ewaste" />'));
    assert.ok(catHtml.includes('<meta property="og:title"'));
    assert.ok(catHtml.includes('<meta name="twitter:card" content="summary_large_image" />'));

    const loginHtml = injectSeoIntoHtml(baseHtml, '/login', snapshot);
    assert.ok(loginHtml.includes('<meta name="robots" content="noindex, nofollow" />'));
    assert.ok(!loginHtml.includes('epr-seo-jsonld'));

    const adminHtml = injectSeoIntoHtml(baseHtml, '/admin', snapshot);
    assert.ok(adminHtml.includes('<meta name="robots" content="noindex, nofollow" />'));
  });

  it('audits missing metadata, duplicates, and canonical errors accurately', () => {
    const pages: SeoPageInput[] = [
      {
        id: 'p1',
        slug: '/',
        pageType: 'core',
        pageTitle: 'Home',
        contentSummary: 'Home summary',
        seoTitle: 'Shared Title | ETP – EPR Bazaar',
        metaDescription: 'Unique description one',
        canonicalUrl: 'https://etp.eprbazaar.com/',
        robots: 'index, follow',
        published: true,
        isSystemPage: true,
      },
      {
        id: 'p2',
        slug: '/about',
        pageType: 'core',
        pageTitle: 'About',
        contentSummary: 'About summary',
        seoTitle: 'Shared Title | ETP – EPR Bazaar',
        metaDescription: '',
        canonicalUrl: 'https://etp.eprbazaar.com/about/',
        robots: 'index, follow',
        published: true,
        isSystemPage: true,
      },
      {
        id: 'p3',
        slug: '/contact',
        pageType: 'core',
        pageTitle: 'Contact',
        contentSummary: 'Contact summary',
        seoTitle: '',
        metaDescription: 'Unique description one',
        canonicalUrl: 'https://etp.eprbazaar.com/contact',
        robots: 'index, follow',
        published: true,
        isSystemPage: true,
      },
    ];

    const report = auditSeoPages(pages, []);
    assert.equal(report.totalPublicPages, 3);
    assert.equal(report.pagesMissingTitles, 1);
    assert.equal(report.pagesMissingDescriptions, 1);
    assert.equal(report.duplicateWarnings, 2);
    assert.equal(report.canonicalErrors, 1);
    assert.equal(report.sitemapStatus, 'Needs Attention');
  });

  it('enforces admin authorization on regenerate/suggest endpoints and returns unapproved drafts only', async () => {
    invalidateSeoCache();
    let dynamicPages = [...DEFAULT_PUBLIC_SEO_PAGES.slice(0, 2)];

    const srv = startTestServer({
      listSeoPages: async () => dynamicPages,
      listActiveCategories: async () => [],
      getLastUpdatedIso: async () => '2026-11-15T10:00:00Z',
      isAdminUser: async (_uid, email) => email === 'ajaykumartiwari609@gmail.com',
    });

    const baseUrl = await srv.listen();
    try {
      // Unauthorized without token
      const noAuth = await fetch(`${baseUrl}/api/seo/regenerate`, { method: 'POST' });
      assert.equal(noAuth.status, 401);

      // Forbidden for non-admin buyer
      const buyerAuth = await fetch(`${baseUrl}/api/seo/regenerate`, {
        method: 'POST',
        headers: { Authorization: 'Bearer buyer-token' },
      });
      assert.equal(buyerAuth.status, 403);

      // Admin adds new page and triggers regenerate
      dynamicPages = [
        ...dynamicPages,
        {
          id: 'page-new-custom',
          slug: '/battery-epr-guide',
          pageType: 'custom',
          pageTitle: 'Battery Waste EPR Guide',
          contentSummary: 'Guide for battery producers and recyclers managing EPR obligations.',
          seoTitle: 'Battery Waste EPR Guide | ETP – EPR Bazaar',
          metaDescription: 'Compliance guide for Battery Waste EPR trading in India.',
          canonicalUrl: `${CANONICAL_ORIGIN}/battery-epr-guide`,
          robots: 'index, follow',
          published: true,
          isSystemPage: false,
        },
      ];

      const regenRes = await fetch(`${baseUrl}/api/seo/regenerate`, {
        method: 'POST',
        headers: { Authorization: 'Bearer admin-token' },
      });
      assert.equal(regenRes.status, 200);
      const regenBody = (await regenRes.json()) as { ok: boolean; audit: { totalUrlsInSitemap: number } };
      assert.equal(regenBody.ok, true);
      assert.equal(regenBody.audit.totalUrlsInSitemap, 3);
      assert.equal(srv.getRegenCount(), 1);

      const updatedXmlRes = await fetch(`${baseUrl}/sitemap-pages.xml`);
      const updatedXml = await updatedXmlRes.text();
      assert.ok(updatedXml.includes('https://etp.eprbazaar.com/battery-epr-guide'));

      // Unapproved draft generation returns approved: false
      const suggestRes = await fetch(`${baseUrl}/api/seo/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-token',
        },
        body: JSON.stringify({
          pageTitle: 'Tyre EPR Credits Overview',
          slug: '/tyre-epr-overview',
          contentSummary: 'Overview of Tyre Waste Management EPR credits and authorized recyclers across India.',
          existingTitles: [],
        }),
      });
      assert.equal(suggestRes.status, 200);
      const suggestJson = (await suggestRes.json()) as {
        ok: boolean;
        approved: boolean;
        aiDraftSeoTitle: string;
        aiDraftMetaDescription: string;
      };
      assert.equal(suggestJson.ok, true);
      assert.equal(suggestJson.approved, false);
      assert.ok(suggestJson.aiDraftSeoTitle.length > 10);
      assert.ok(suggestJson.aiDraftMetaDescription.length > 30);
    } finally {
      await srv.close();
    }
  });
});
