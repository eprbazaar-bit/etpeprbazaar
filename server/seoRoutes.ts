export interface SitemapRouteEntry {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

export const PUBLIC_SITEMAP_ROUTES: SitemapRouteEntry[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/marketplace', changefreq: 'daily', priority: '0.9' },
  { path: '/market-rates', changefreq: 'daily', priority: '0.9' },
  { path: '/buy-credits', changefreq: 'weekly', priority: '0.8' },
  { path: '/sell-credits', changefreq: 'weekly', priority: '0.8' },
  { path: '/how-it-works', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
  { path: '/buyer-guidelines', changefreq: 'monthly', priority: '0.6' },
  { path: '/seller-guidelines', changefreq: 'monthly', priority: '0.6' },
  { path: '/grievance', changefreq: 'monthly', priority: '0.5' },
  { path: '/login', changefreq: 'monthly', priority: '0.6' },
  { path: '/terms', changefreq: 'yearly', priority: '0.4' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.4' },
  { path: '/refund', changefreq: 'yearly', priority: '0.4' },
  { path: '/disclaimer', changefreq: 'yearly', priority: '0.4' },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSitemapXml(baseUrl: string, lastmod?: string): string {
  const normalizedBase = (baseUrl || 'https://etp.eprbazaar.com').replace(/\/+$/, '');
  const dateStr = lastmod || new Date().toISOString().slice(0, 10);

  const urlNodes = PUBLIC_SITEMAP_ROUTES.map((entry) => {
    const loc = entry.path === '/' ? `${normalizedBase}/` : `${normalizedBase}${entry.path}`;
    return [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${escapeXml(dateStr)}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlNodes,
    '</urlset>',
    '',
  ].join('\n');
}

export function generateRobotsTxt(baseUrl: string): string {
  const normalizedBase = (baseUrl || 'https://etp.eprbazaar.com').replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${normalizedBase}/sitemap.xml`,
    '',
  ].join('\n');
}
