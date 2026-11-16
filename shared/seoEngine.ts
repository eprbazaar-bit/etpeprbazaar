export const CANONICAL_ORIGIN = 'https://etp.eprbazaar.com';
export const DEFAULT_OG_IMAGE_PATH = '/assets/aistudio/epr_bazaar_logo__9ac2c6f9.jpeg';
export const DEFAULT_OG_IMAGE_URL = `${CANONICAL_ORIGIN}${DEFAULT_OG_IMAGE_PATH}`;
export const SITE_BRAND_NAME = 'ETP – EPR Bazaar';
export const OPERATOR_LEGAL_NAME = 'NYANVI ECOCLEAN PRIVATE LIMITED';

export type SeoRobotsDirective = 'index, follow' | 'noindex, nofollow';
export type SeoPageType = 'core' | 'legal' | 'custom';

export interface SeoPageInput {
  id: string;
  slug: string;
  pageType: SeoPageType;
  pageTitle: string;
  contentSummary: string;
  seoTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robots?: SeoRobotsDirective;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary_large_image' | 'summary';
  published: boolean;
  isSystemPage: boolean;
  updatedAtIso?: string;
}

export interface CategorySeoInput {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  unit: 'MT' | 'KL' | 'Units';
  active: boolean;
  updatedAtIso?: string;
}

export interface ResolvedSeoMetadata {
  pageTitle: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robots: SeoRobotsDirective;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: 'website';
  ogSiteName: string;
  twitterCard: 'summary_large_image' | 'summary';
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  structuredData: Record<string, unknown>[];
}

export interface SeoAuditIssue {
  pageId: string;
  slug: string;
  pageTitle: string;
  issueType:
    | 'missing_title'
    | 'missing_description'
    | 'duplicate_title'
    | 'duplicate_description'
    | 'canonical_error'
    | 'restricted_indexable';
  message: string;
}

export interface SeoAuditReport {
  totalPublicPages: number;
  publishedPublicPages: number;
  activeCategoryPages: number;
  totalUrlsInSitemap: number;
  pagesMissingTitles: number;
  pagesMissingDescriptions: number;
  duplicateWarnings: number;
  canonicalErrors: number;
  sitemapStatus: 'Healthy' | 'Needs Attention';
  issues: SeoAuditIssue[];
  perPageValidation: Record<
    string,
    {
      titleLength: number;
      descriptionLength: number;
      canonicalValid: boolean;
      hasDuplicateTitle: boolean;
      hasDuplicateDescription: boolean;
      issues: string[];
    }
  >;
}

export const RESTRICTED_PATH_PREFIXES = [
  '/admin',
  '/buyer',
  '/seller',
  '/facilitator',
  '/dashboard',
  '/login',
  '/login-error',
  '/access-denied',
  '/profile-completion',
  '/password-reset',
  '/api',
];

export const DEFAULT_PUBLIC_SEO_PAGES: SeoPageInput[] = [
  {
    id: 'page-home',
    slug: '/',
    pageType: 'core',
    pageTitle: 'India’s EPR Credit Trading Marketplace',
    contentSummary:
      'Connect with verified EPR Credit Buyers and Sellers across Plastic, E-Waste, Battery, Tyre, and Used Oil categories. Submit your quantity and expected rate while EPR Bazaar manages negotiations.',
    seoTitle: 'ETP – EPR Bazaar | India’s B2B EPR Credit Trading Marketplace',
    metaDescription:
      'Trade verified Plastic, E-Waste, Battery, Tyre, and Used Oil EPR credits on ETP – EPR Bazaar. Submit buyer requirements or seller inventory with managed negotiations.',
    canonicalUrl: `${CANONICAL_ORIGIN}/`,
    robots: 'index, follow',
    ogTitle: 'ETP – EPR Bazaar | India’s B2B EPR Credit Trading Marketplace',
    ogDescription:
      'Private managed B2B marketplace for Plastic, E-Waste, Battery, Tyre, and Used Oil EPR credit trading in India.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-marketplace',
    slug: '/marketplace',
    pageType: 'core',
    pageTitle: 'EPR Credit Marketplace Inventory Explorer',
    contentSummary:
      'Browse active verified EPR credit seller lots across financial years and categories with full counterparty confidentiality and facilitator coordination.',
    seoTitle: 'EPR Credit Marketplace & Available Lots | ETP – EPR Bazaar',
    metaDescription:
      'Explore verified EPR credit inventory lots across Plastic, E-Waste, Battery, Tyre, and Used Oil categories. Request facilitated matching for your compliance year.',
    canonicalUrl: `${CANONICAL_ORIGIN}/marketplace`,
    robots: 'index, follow',
    ogTitle: 'EPR Credit Marketplace & Available Lots | ETP – EPR Bazaar',
    ogDescription:
      'Browse active EPR credit inventory lots and submit matching requirements privately via EPR Bazaar.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-market-rates',
    slug: '/market-rates',
    pageType: 'core',
    pageTitle: 'Published EPR Market Rates Board',
    contentSummary:
      'Official desk schedule displaying category-wise published EPR credit reference rates per MT, KL, and Unit across applicable financial years.',
    seoTitle: 'Published EPR Market Rates & Reference Quotes | ETP – EPR Bazaar',
    metaDescription:
      'Check live desk-published EPR credit reference rates per MT across Plastic Cat I–IV, E-Waste, Battery, Tyre, and Used Oil for current financial years.',
    canonicalUrl: `${CANONICAL_ORIGIN}/market-rates`,
    robots: 'index, follow',
    ogTitle: 'Published EPR Market Rates & Reference Quotes | ETP – EPR Bazaar',
    ogDescription:
      'Review approved category-wise EPR reference rates and market trends updated by the EPR Bazaar trading desk.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-buy-credits',
    slug: '/buy-credits',
    pageType: 'core',
    pageTitle: 'Buy EPR Credits for PIBOs & Producers',
    contentSummary:
      'Submit EPR compliance credit requirements by category, financial year, quantity, and maximum target buying rate with automatic matching and managed offers.',
    seoTitle: 'Buy EPR Credits for PIBOs & Brand Owners | ETP – EPR Bazaar',
    metaDescription:
      'Procure verified Plastic, E-Waste, Battery, Tyre, and Used Oil EPR credits for your annual targets with automated matching and confidential facilitator negotiations.',
    canonicalUrl: `${CANONICAL_ORIGIN}/buy-credits`,
    robots: 'index, follow',
    ogTitle: 'Buy EPR Credits for PIBOs & Brand Owners | ETP – EPR Bazaar',
    ogDescription:
      'Submit your EPR credit target quantity and rate to receive matched seller offers through EPR Bazaar.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-sell-credits',
    slug: '/sell-credits',
    pageType: 'core',
    pageTitle: 'Sell EPR Credits for Verified Recyclers',
    contentSummary:
      'List certified EPR credit inventory as an authorized waste processor or recycler and receive matched corporate buyer enquiries managed by EPR Bazaar.',
    seoTitle: 'Sell EPR Credits for Authorized Recyclers | ETP – EPR Bazaar',
    metaDescription:
      'Monetize verified EPR certificates across Plastic, E-Waste, Battery, Tyre, and Used Oil categories. List inventory and receive matched B2B buyer enquiries.',
    canonicalUrl: `${CANONICAL_ORIGIN}/sell-credits`,
    robots: 'index, follow',
    ogTitle: 'Sell EPR Credits for Authorized Recyclers | ETP – EPR Bazaar',
    ogDescription:
      'Publish verified EPR credit inventory to reach registered PIBO buyers with structured invoicing and settlement.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-how-it-works',
    slug: '/how-it-works',
    pageType: 'core',
    pageTitle: 'How ETP – EPR Bazaar Works',
    contentSummary:
      'Understand our 5-step managed B2B workflow from corporate onboarding, rate matching, and confidential facilitator offers through GST invoicing and transfer tracking.',
    seoTitle: 'How Managed EPR Credit Trading Works | ETP – EPR Bazaar',
    metaDescription:
      'Learn how ETP – EPR Bazaar matches buyer requirements with verified recycler inventory while coordinating confidential offers, GST invoicing, and credit transfers.',
    canonicalUrl: `${CANONICAL_ORIGIN}/how-it-works`,
    robots: 'index, follow',
    ogTitle: 'How Managed EPR Credit Trading Works | ETP – EPR Bazaar',
    ogDescription:
      'Discover the step-by-step EPR credit procurement, selling, matching, and settlement process on ETP – EPR Bazaar.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-about',
    slug: '/about',
    pageType: 'core',
    pageTitle: 'About ETP – EPR Bazaar & Nyanvi Ecoclean',
    contentSummary:
      'Operated by NYANVI ECOCLEAN PRIVATE LIMITED (CIN: U38220WB2024PTC274770), ETP – EPR Bazaar provides structured institutional B2B EPR credit trading in India.',
    seoTitle: 'About ETP – EPR Bazaar | Nyanvi Ecoclean Private Limited',
    metaDescription:
      'Learn about ETP – EPR Bazaar, India’s private managed B2B EPR credit trading platform operated by Nyanvi Ecoclean Private Limited in Kolkata.',
    canonicalUrl: `${CANONICAL_ORIGIN}/about`,
    robots: 'index, follow',
    ogTitle: 'About ETP – EPR Bazaar | Nyanvi Ecoclean Private Limited',
    ogDescription:
      'Corporate profile and institutional governance of ETP – EPR Bazaar by Nyanvi Ecoclean Private Limited.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-contact',
    slug: '/contact',
    pageType: 'core',
    pageTitle: 'Contact EPR Bazaar Facilitation Desk',
    contentSummary:
      'Reach NYANVI ECOCLEAN PRIVATE LIMITED at info@eprbazaar.com or +91 7439103014, Park Street Area, Kolkata, for B2B EPR trading support and corporate onboarding.',
    seoTitle: 'Contact Us & Facilitation Desk | ETP – EPR Bazaar',
    metaDescription:
      'Contact the ETP – EPR Bazaar trading desk at info@eprbazaar.com or +91 7439103014 for buyer procurement, recycler onboarding, and EPR credit enquiries.',
    canonicalUrl: `${CANONICAL_ORIGIN}/contact`,
    robots: 'index, follow',
    ogTitle: 'Contact Us & Facilitation Desk | ETP – EPR Bazaar',
    ogDescription:
      'Connect with Nyanvi Ecoclean Private Limited for B2B EPR credit procurement and recycler onboarding support.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-faq',
    slug: '/faq',
    pageType: 'core',
    pageTitle: 'Frequently Asked Questions on EPR Trading',
    contentSummary:
      'Answers on managed intermediary negotiations, counterparty confidentiality, corporate verification, GST invoicing, and credit transfer milestones on ETP – EPR Bazaar.',
    seoTitle: 'EPR Trading FAQ & Platform Guide | ETP – EPR Bazaar',
    metaDescription:
      'Find answers to common questions on EPR credit buying, recycler verification, confidential facilitator negotiations, and settlement on ETP – EPR Bazaar.',
    canonicalUrl: `${CANONICAL_ORIGIN}/faq`,
    robots: 'index, follow',
    ogTitle: 'EPR Trading FAQ & Platform Guide | ETP – EPR Bazaar',
    ogDescription:
      'Frequently asked questions covering buyer requirements, seller listings, confidentiality, and trade settlement.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-buyer-guidelines',
    slug: '/buyer-guidelines',
    pageType: 'legal',
    pageTitle: 'EPR Credit Buyer Guidelines',
    contentSummary:
      'Guidelines for PIBOs and corporate producers on onboarding verification, GSTIN accuracy, submitting target buying rates, and responding to facilitated offers.',
    seoTitle: 'Buyer Guidelines for PIBOs & Producers | ETP – EPR Bazaar',
    metaDescription:
      'Read mandatory buyer onboarding, KYC verification, target requirement submission, and facilitated offer response guidelines on ETP – EPR Bazaar.',
    canonicalUrl: `${CANONICAL_ORIGIN}/buyer-guidelines`,
    robots: 'index, follow',
    ogTitle: 'Buyer Guidelines for PIBOs & Producers | ETP – EPR Bazaar',
    ogDescription:
      'Compliance and commercial guidelines for registered corporate EPR credit buyers.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-seller-guidelines',
    slug: '/seller-guidelines',
    pageType: 'legal',
    pageTitle: 'EPR Credit Seller Guidelines',
    contentSummary:
      'Guidelines for authorized waste processors and recyclers on EPR certificate verification, inventory accuracy, asking rates, and non-circumvention terms.',
    seoTitle: 'Seller Guidelines for Authorized Recyclers | ETP – EPR Bazaar',
    metaDescription:
      'Review recycler verification rules, certified EPR inventory publishing standards, and facilitated deal execution policies on ETP – EPR Bazaar.',
    canonicalUrl: `${CANONICAL_ORIGIN}/seller-guidelines`,
    robots: 'index, follow',
    ogTitle: 'Seller Guidelines for Authorized Recyclers | ETP – EPR Bazaar',
    ogDescription:
      'Listing standards and non-circumvention guidelines for verified EPR credit sellers.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-grievance',
    slug: '/grievance',
    pageType: 'legal',
    pageTitle: 'Grievance Redressal Policy',
    contentSummary:
      'Official Grievance Officer contact channels for order coordination, payment reconciliation, or verification enquiries at Nyanvi Ecoclean Private Limited.',
    seoTitle: 'Grievance Redressal Policy | ETP – EPR Bazaar',
    metaDescription:
      'Contact the EPR Bazaar Grievance Officer for support on trade coordination, verification status, or commercial settlement escalation.',
    canonicalUrl: `${CANONICAL_ORIGIN}/grievance`,
    robots: 'index, follow',
    ogTitle: 'Grievance Redressal Policy | ETP – EPR Bazaar',
    ogDescription:
      'Escalation and grievance resolution channels at Nyanvi Ecoclean Private Limited.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-terms',
    slug: '/terms',
    pageType: 'legal',
    pageTitle: 'Terms and Conditions',
    contentSummary:
      'Commercial terms governing use of the ETP – EPR Bazaar managed B2B marketplace, intermediary facilitation scope, confidentiality, and participant duties.',
    seoTitle: 'Terms and Conditions | ETP – EPR Bazaar',
    metaDescription:
      'Read the official Terms and Conditions governing B2B EPR credit matching, facilitated negotiations, and transactions on ETP – EPR Bazaar.',
    canonicalUrl: `${CANONICAL_ORIGIN}/terms`,
    robots: 'index, follow',
    ogTitle: 'Terms and Conditions | ETP – EPR Bazaar',
    ogDescription:
      'Commercial marketplace terms for ETP – EPR Bazaar operated by Nyanvi Ecoclean Private Limited.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-privacy',
    slug: '/privacy',
    pageType: 'legal',
    pageTitle: 'Privacy Policy',
    contentSummary:
      'How Nyanvi Ecoclean Private Limited collects, safeguards, and isolates corporate KYC records, GSTIN, mobile numbers, and counterparty identities.',
    seoTitle: 'Privacy Policy & Counterparty Confidentiality | ETP – EPR Bazaar',
    metaDescription:
      'Review how ETP – EPR Bazaar protects corporate KYC records, contact confidentiality, and encrypted compliance documents across all B2B trades.',
    canonicalUrl: `${CANONICAL_ORIGIN}/privacy`,
    robots: 'index, follow',
    ogTitle: 'Privacy Policy & Counterparty Confidentiality | ETP – EPR Bazaar',
    ogDescription:
      'Data protection and strict counterparty anonymity practices on ETP – EPR Bazaar.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-refund',
    slug: '/refund',
    pageType: 'legal',
    pageTitle: 'Refund and Cancellation Policy',
    contentSummary:
      'Rules covering withdrawal of unmatched requirements or unallocated inventory lots and order cancellation terms after bilateral rate confirmation.',
    seoTitle: 'Refund and Cancellation Policy | ETP – EPR Bazaar',
    metaDescription:
      'Understand requirement withdrawal, listing pause options, and order cancellation terms on ETP – EPR Bazaar prior to and after bilateral confirmation.',
    canonicalUrl: `${CANONICAL_ORIGIN}/refund`,
    robots: 'index, follow',
    ogTitle: 'Refund and Cancellation Policy | ETP – EPR Bazaar',
    ogDescription:
      'Withdrawal and settlement cancellation policies on ETP – EPR Bazaar.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
  {
    id: 'page-disclaimer',
    slug: '/disclaimer',
    pageType: 'legal',
    pageTitle: 'Platform Disclaimer',
    contentSummary:
      'Independent private B2B platform disclaimer clarifying separation from CPCB/SPCB portals and distinguishing indicative quotes from executed trade rates.',
    seoTitle: 'Platform Disclaimer | ETP – EPR Bazaar',
    metaDescription:
      'Read the official platform disclaimer regarding ETP – EPR Bazaar’s role as an independent private B2B marketplace and published indicative credit quotes.',
    canonicalUrl: `${CANONICAL_ORIGIN}/disclaimer`,
    robots: 'index, follow',
    ogTitle: 'Platform Disclaimer | ETP – EPR Bazaar',
    ogDescription:
      'Regulatory independence and market quote disclosures for ETP – EPR Bazaar.',
    ogImage: DEFAULT_OG_IMAGE_URL,
    twitterCard: 'summary_large_image',
    published: true,
    isSystemPage: true,
  },
];

export function normalizeSlug(rawPath: string): string {
  const withoutHashQuery = (rawPath || '/').split('#')[0].split('?')[0].trim();
  const collapsed = withoutHashQuery.replace(/\/+/g, '/').toLowerCase();
  if (!collapsed || collapsed === '/') return '/';
  const withLeading = collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
  const stripped = withLeading.replace(/\/+$/, '');
  return stripped || '/';
}

export function isRestrictedPath(rawPath: string): boolean {
  const normalized = normalizeSlug(rawPath);
  return RESTRICTED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function buildCanonicalUrl(rawPath: string, origin = CANONICAL_ORIGIN): string {
  const cleanOrigin = (origin || CANONICAL_ORIGIN).trim().replace(/^http:\/\//i, 'https://').replace(/\/+$/, '');
  const slug = normalizeSlug(rawPath);
  return slug === '/' ? `${cleanOrigin}/` : `${cleanOrigin}${slug}`;
}

export function validateCanonicalUrl(canonicalUrl: string, expectedSlug: string): {
  valid: boolean;
  reason?: string;
} {
  const trimmed = (canonicalUrl || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'Canonical URL is empty.' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Canonical URL must use HTTPS.' };
    }
    if (parsed.hostname.toLowerCase() !== 'etp.eprbazaar.com') {
      return { valid: false, reason: 'Canonical domain must be etp.eprbazaar.com.' };
    }
    if (parsed.search || parsed.hash) {
      return { valid: false, reason: 'Canonical URL must not contain query parameters or hashes.' };
    }
    const normalizedExpected = normalizeSlug(expectedSlug);
    const normalizedActual = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      return { valid: false, reason: 'Non-root canonical URL must not have a trailing slash.' };
    }
    if (normalizedActual !== normalizedExpected) {
      return { valid: false, reason: `Canonical path (${parsed.pathname}) does not match page slug (${normalizedExpected}).` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Canonical URL format is invalid.' };
  }
}

export function truncateSeoText(text: string, maxLen: number): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > Math.floor(maxLen * 0.6) ? sliced.slice(0, lastSpace) : sliced).trim() + '…';
}

export function generateDeterministicSeoDraft(input: {
  pageTitle: string;
  slug: string;
  contentSummary: string;
  existingTitles?: string[];
}): {
  seoTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
} {
  const cleanSlug = normalizeSlug(input.slug);
  const canonicalUrl = buildCanonicalUrl(cleanSlug);
  const baseName = (input.pageTitle || 'EPR Credit Marketplace').replace(/\s+/g, ' ').trim();
  let candidateTitle = baseName.includes('EPR Bazaar')
    ? baseName
    : `${baseName} | ${SITE_BRAND_NAME}`;
  candidateTitle = truncateSeoText(candidateTitle, 64);

  const takenTitles = new Set((input.existingTitles || []).map((t) => t.trim().toLowerCase()));
  if (takenTitles.has(candidateTitle.toLowerCase()) && cleanSlug !== '/') {
    const slugLabel = cleanSlug
      .replace(/^\//, '')
      .split('/')
      .pop()
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    candidateTitle = truncateSeoText(`${baseName} (${slugLabel}) | ${SITE_BRAND_NAME}`, 64);
  }

  const rawSummary = (input.contentSummary || '').replace(/\s+/g, ' ').trim();
  const baseDesc =
    rawSummary.length >= 60
      ? rawSummary
      : `${baseName} on ${SITE_BRAND_NAME}. Connect with verified B2B EPR credit buyers and recyclers across India with managed negotiations.`;
  const metaDescription = truncateSeoText(baseDesc, 158);

  return {
    seoTitle: candidateTitle,
    metaDescription,
    ogTitle: candidateTitle,
    ogDescription: metaDescription,
    canonicalUrl,
  };
}

export function buildStructuredDataForRoute(params: {
  slug: string;
  title: string;
  description: string;
  canonicalUrl: string;
}): Record<string, unknown>[] {
  const orgNode: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: OPERATOR_LEGAL_NAME,
    alternateName: SITE_BRAND_NAME,
    url: `${CANONICAL_ORIGIN}/`,
    logo: DEFAULT_OG_IMAGE_URL,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-7439103014',
      email: 'info@eprbazaar.com',
      contactType: 'customer support',
      areaServed: 'IN',
    },
  };

  const webPageNode: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': params.slug === '/faq' ? 'FAQPage' : 'WebPage',
    name: params.title,
    description: params.description,
    url: params.canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_BRAND_NAME,
      url: `${CANONICAL_ORIGIN}/`,
    },
  };

  if (params.slug === '/') {
    return [
      orgNode,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_BRAND_NAME,
        url: `${CANONICAL_ORIGIN}/`,
        description: params.description,
      },
      webPageNode,
    ];
  }

  return [orgNode, webPageNode];
}

export function resolveMetadataForPath(
  rawPath: string,
  seoPages: SeoPageInput[],
  categories: CategorySeoInput[] = []
): ResolvedSeoMetadata {
  const cleanSlug = normalizeSlug(rawPath);

  if (isRestrictedPath(cleanSlug)) {
    const labelMap: Record<string, string> = {
      '/login': 'Portal Sign In',
      '/login-error': 'Authentication Failed',
      '/access-denied': 'Access Denied',
      '/profile-completion': 'Complete Company Profile',
      '/password-reset': 'Password Reset',
      '/admin': 'Administrator Portal',
      '/buyer': 'Buyer Portal',
      '/seller': 'Seller Portal',
      '/facilitator': 'Facilitator Portal',
      '/dashboard': 'Trading Dashboard',
    };
    const matchedPrefix = Object.keys(labelMap).find(
      (p) => cleanSlug === p || cleanSlug.startsWith(`${p}/`)
    );
    const titleLabel = matchedPrefix ? labelMap[matchedPrefix] : 'Restricted Portal Access';
    const title = `${titleLabel} | ${SITE_BRAND_NAME}`;
    const desc =
      'Authorized participant portal access for ETP – EPR Bazaar managed B2B environmental credit trading.';
    const canonicalUrl = buildCanonicalUrl(cleanSlug);
    return {
      pageTitle: titleLabel,
      seoTitle: title,
      metaDescription: desc,
      canonicalUrl,
      robots: 'noindex, nofollow',
      ogTitle: title,
      ogDescription: desc,
      ogImage: DEFAULT_OG_IMAGE_URL,
      ogType: 'website',
      ogSiteName: SITE_BRAND_NAME,
      twitterCard: 'summary_large_image',
      twitterTitle: title,
      twitterDescription: desc,
      twitterImage: DEFAULT_OG_IMAGE_URL,
      structuredData: [],
    };
  }

  // Category page (/category/<id>)
  if (cleanSlug.startsWith('/category/')) {
    const catIdRaw = decodeURIComponent(cleanSlug.slice('/category/'.length));
    const cat = categories.find((c) => c.id.toLowerCase() === catIdRaw.toLowerCase() && c.active);
    if (cat) {
      const catSlug = `/category/${cat.id}`;
      const canonicalUrl = buildCanonicalUrl(catSlug);
      const hasEprCreditsLabel = /epr\s+credits?/i.test(cat.name);
      const rawCatTitle = hasEprCreditsLabel
        ? `${cat.name} (${cat.code}) | ${SITE_BRAND_NAME}`
        : `${cat.name} EPR Credits (${cat.code}) | ${SITE_BRAND_NAME}`;
      const seoTitle = truncateSeoText(rawCatTitle, 64);
      const metaDescription = truncateSeoText(
        cat.description ||
          `Trade verified ${cat.name} EPR credits measured in ${cat.unit} on ${SITE_BRAND_NAME} with published desk rates and confidential facilitator negotiations.`,
        158
      );
      return {
        pageTitle: cat.name,
        seoTitle,
        metaDescription,
        canonicalUrl,
        robots: 'index, follow',
        ogTitle: seoTitle,
        ogDescription: metaDescription,
        ogImage: DEFAULT_OG_IMAGE_URL,
        ogType: 'website',
        ogSiteName: SITE_BRAND_NAME,
        twitterCard: 'summary_large_image',
        twitterTitle: seoTitle,
        twitterDescription: metaDescription,
        twitterImage: DEFAULT_OG_IMAGE_URL,
        structuredData: buildStructuredDataForRoute({
          slug: catSlug,
          title: seoTitle,
          description: metaDescription,
          canonicalUrl,
        }),
      };
    }
  }

  const matchedPage = seoPages.find((p) => normalizeSlug(p.slug) === cleanSlug);
  const fallbackPage = DEFAULT_PUBLIC_SEO_PAGES.find((p) => normalizeSlug(p.slug) === cleanSlug);
  const page = matchedPage || fallbackPage;

  if (!page) {
    const canonicalUrl = buildCanonicalUrl('/');
    const home = DEFAULT_PUBLIC_SEO_PAGES[0];
    return {
      pageTitle: 'Page Not Found',
      seoTitle: `Page Not Found | ${SITE_BRAND_NAME}`,
      metaDescription: home.metaDescription || '',
      canonicalUrl,
      robots: 'noindex, nofollow',
      ogTitle: `Page Not Found | ${SITE_BRAND_NAME}`,
      ogDescription: home.metaDescription || '',
      ogImage: DEFAULT_OG_IMAGE_URL,
      ogType: 'website',
      ogSiteName: SITE_BRAND_NAME,
      twitterCard: 'summary_large_image',
      twitterTitle: `Page Not Found | ${SITE_BRAND_NAME}`,
      twitterDescription: home.metaDescription || '',
      twitterImage: DEFAULT_OG_IMAGE_URL,
      structuredData: [],
    };
  }

  const generated = generateDeterministicSeoDraft({
    pageTitle: page.pageTitle,
    slug: page.slug,
    contentSummary: page.contentSummary,
  });

  const seoTitle = (page.seoTitle || '').trim() || generated.seoTitle;
  const metaDescription = (page.metaDescription || '').trim() || generated.metaDescription;
  const canonicalUrl = buildCanonicalUrl(page.slug);
  const robots: SeoRobotsDirective = !page.published
    ? 'noindex, nofollow'
    : page.robots || 'index, follow';
  const ogTitle = (page.ogTitle || '').trim() || seoTitle;
  const ogDescription = (page.ogDescription || '').trim() || metaDescription;
  const ogImage = (page.ogImage || '').trim() || DEFAULT_OG_IMAGE_URL;
  const twitterCard = page.twitterCard || 'summary_large_image';

  return {
    pageTitle: page.pageTitle,
    seoTitle,
    metaDescription,
    canonicalUrl,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    ogType: 'website',
    ogSiteName: SITE_BRAND_NAME,
    twitterCard,
    twitterTitle: ogTitle,
    twitterDescription: ogDescription,
    twitterImage: ogImage,
    structuredData:
      robots === 'index, follow'
        ? buildStructuredDataForRoute({
            slug: cleanSlug,
            title: seoTitle,
            description: metaDescription,
            canonicalUrl,
          })
        : [],
  };
}

export function auditSeoPages(
  pages: SeoPageInput[],
  categories: CategorySeoInput[] = []
): SeoAuditReport {
  const issues: SeoAuditIssue[] = [];
  const perPageValidation: SeoAuditReport['perPageValidation'] = {};

  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  const canonicalCounts = new Map<string, number>();

  for (const p of pages) {
    const tKey = (p.seoTitle || '').trim().toLowerCase();
    const dKey = (p.metaDescription || '').trim().toLowerCase();
    const cKey = (p.canonicalUrl || '').trim().toLowerCase();
    if (tKey) titleCounts.set(tKey, (titleCounts.get(tKey) || 0) + 1);
    if (dKey) descCounts.set(dKey, (descCounts.get(dKey) || 0) + 1);
    if (cKey) canonicalCounts.set(cKey, (canonicalCounts.get(cKey) || 0) + 1);
  }

  let pagesMissingTitles = 0;
  let pagesMissingDescriptions = 0;
  let duplicateWarnings = 0;
  let canonicalErrors = 0;

  for (const p of pages) {
    const pageIssues: string[] = [];
    const title = (p.seoTitle || '').trim();
    const desc = (p.metaDescription || '').trim();
    const canonicalCheck = validateCanonicalUrl(p.canonicalUrl || '', p.slug);
    const hasDupTitle = Boolean(title && (titleCounts.get(title.toLowerCase()) || 0) > 1);
    const hasDupDesc = Boolean(desc && (descCounts.get(desc.toLowerCase()) || 0) > 1);
    const hasDupCanonical = Boolean(
      p.canonicalUrl && (canonicalCounts.get(p.canonicalUrl.trim().toLowerCase()) || 0) > 1
    );

    if (!title) {
      pagesMissingTitles += 1;
      const msg = 'Missing SEO meta title.';
      pageIssues.push(msg);
      issues.push({
        pageId: p.id,
        slug: p.slug,
        pageTitle: p.pageTitle,
        issueType: 'missing_title',
        message: msg,
      });
    }

    if (!desc) {
      pagesMissingDescriptions += 1;
      const msg = 'Missing SEO meta description.';
      pageIssues.push(msg);
      issues.push({
        pageId: p.id,
        slug: p.slug,
        pageTitle: p.pageTitle,
        issueType: 'missing_description',
        message: msg,
      });
    }

    if (hasDupTitle) {
      const msg = 'Duplicate SEO title detected across multiple pages.';
      pageIssues.push(msg);
      issues.push({
        pageId: p.id,
        slug: p.slug,
        pageTitle: p.pageTitle,
        issueType: 'duplicate_title',
        message: msg,
      });
    }

    if (hasDupDesc) {
      const msg = 'Duplicate meta description detected across multiple pages.';
      pageIssues.push(msg);
      issues.push({
        pageId: p.id,
        slug: p.slug,
        pageTitle: p.pageTitle,
        issueType: 'duplicate_description',
        message: msg,
      });
    }

    if (!canonicalCheck.valid || hasDupCanonical) {
      canonicalErrors += 1;
      const msg = !canonicalCheck.valid
        ? canonicalCheck.reason || 'Invalid canonical URL.'
        : 'Duplicate canonical URL conflict.';
      pageIssues.push(msg);
      issues.push({
        pageId: p.id,
        slug: p.slug,
        pageTitle: p.pageTitle,
        issueType: 'canonical_error',
        message: msg,
      });
    }

    if (isRestrictedPath(p.slug) && p.published && p.robots !== 'noindex, nofollow') {
      canonicalErrors += 1;
      const msg = 'Restricted portal/auth route must not be indexable.';
      pageIssues.push(msg);
      issues.push({
        pageId: p.id,
        slug: p.slug,
        pageTitle: p.pageTitle,
        issueType: 'restricted_indexable',
        message: msg,
      });
    }

    perPageValidation[p.id] = {
      titleLength: title.length,
      descriptionLength: desc.length,
      canonicalValid: canonicalCheck.valid && !hasDupCanonical,
      hasDuplicateTitle: hasDupTitle,
      hasDuplicateDescription: hasDupDesc,
      issues: pageIssues,
    };
  }

  for (const count of titleCounts.values()) {
    if (count > 1) duplicateWarnings += 1;
  }
  for (const count of descCounts.values()) {
    if (count > 1) duplicateWarnings += 1;
  }

  const indexablePages = getIndexableSitemapPageEntries(pages);
  const indexableCategories = getIndexableCategoryEntries(categories);

  return {
    totalPublicPages: pages.length,
    publishedPublicPages: indexablePages.length,
    activeCategoryPages: indexableCategories.length,
    totalUrlsInSitemap: indexablePages.length + indexableCategories.length,
    pagesMissingTitles,
    pagesMissingDescriptions,
    duplicateWarnings,
    canonicalErrors,
    sitemapStatus:
      pagesMissingTitles === 0 &&
      pagesMissingDescriptions === 0 &&
      duplicateWarnings === 0 &&
      canonicalErrors === 0 &&
      indexablePages.length > 0
        ? 'Healthy'
        : 'Needs Attention',
    issues,
    perPageValidation,
  };
}

export interface SitemapUrlItem {
  loc: string;
  lastmod: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

export function getIndexableSitemapPageEntries(
  pages: SeoPageInput[],
  origin = CANONICAL_ORIGIN
): SitemapUrlItem[] {
  const seen = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);
  const items: SitemapUrlItem[] = [];

  for (const page of pages) {
    if (!page.published) continue;
    if (page.robots === 'noindex, nofollow') continue;
    const normalized = normalizeSlug(page.slug);
    if (isRestrictedPath(normalized)) continue;

    const loc = buildCanonicalUrl(normalized, origin);
    if (seen.has(loc)) continue;
    seen.add(loc);

    let priority = '0.7';
    let changefreq: SitemapUrlItem['changefreq'] = 'monthly';
    if (normalized === '/') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (normalized === '/marketplace' || normalized === '/market-rates') {
      priority = '0.9';
      changefreq = 'daily';
    } else if (normalized === '/buy-credits' || normalized === '/sell-credits' || normalized === '/how-it-works') {
      priority = '0.8';
      changefreq = 'weekly';
    } else if (page.pageType === 'legal') {
      priority = '0.4';
      changefreq = 'yearly';
    }

    const lastmod = (page.updatedAtIso || today).slice(0, 10);
    items.push({ loc, lastmod, changefreq, priority });
  }

  return items;
}

export function getIndexableCategoryEntries(
  categories: CategorySeoInput[],
  origin = CANONICAL_ORIGIN
): SitemapUrlItem[] {
  const seen = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);
  const items: SitemapUrlItem[] = [];

  for (const cat of categories) {
    if (!cat.active || !cat.id) continue;
    const slug = `/category/${encodeURIComponent(cat.id)}`;
    const loc = buildCanonicalUrl(slug, origin);
    if (seen.has(loc)) continue;
    seen.add(loc);
    const lastmod = (cat.updatedAtIso || today).slice(0, 10);
    items.push({
      loc,
      lastmod,
      changefreq: 'daily',
      priority: '0.8',
    });
  }

  return items;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderUrlSetXml(items: SitemapUrlItem[]): string {
  const urlNodes = items
    .map((entry) =>
      [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n')
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlNodes,
    '</urlset>',
    '',
  ].join('\n');
}

export function renderSitemapIndexXml(
  sitemaps: { loc: string; lastmod: string }[]
): string {
  const nodes = sitemaps
    .map((sm) =>
      [
        '  <sitemap>',
        `    <loc>${escapeXml(sm.loc)}</loc>`,
        `    <lastmod>${escapeXml(sm.lastmod.slice(0, 10))}</lastmod>`,
        '  </sitemap>',
      ].join('\n')
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    nodes,
    '</sitemapindex>',
    '',
  ].join('\n');
}

export function renderRobotsTxt(origin = CANONICAL_ORIGIN): string {
  const cleanOrigin = (origin || CANONICAL_ORIGIN).trim().replace(/^http:\/\//i, 'https://').replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /assets/',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /buyer',
    'Disallow: /buyer/',
    'Disallow: /seller',
    'Disallow: /seller/',
    'Disallow: /facilitator',
    'Disallow: /facilitator/',
    'Disallow: /dashboard',
    'Disallow: /dashboard/',
    'Disallow: /login',
    'Disallow: /login-error',
    'Disallow: /access-denied',
    'Disallow: /profile-completion',
    'Disallow: /password-reset',
    '',
    `Sitemap: ${cleanOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}
