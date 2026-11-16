import { ResolvedSeoMetadata } from '../../shared/seoEngine';

function upsertMetaByName(name: string, content: string): void {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertMetaByProperty(property: string, content: string): void {
  let el = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertStructuredData(nodes: Record<string, unknown>[]): void {
  const existing = document.getElementById('epr-seo-jsonld');
  if (!nodes || nodes.length === 0) {
    if (existing) existing.remove();
    return;
  }
  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'epr-seo-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(nodes.length === 1 ? nodes[0] : nodes);
}

export function applyResolvedSeoToDocument(meta: ResolvedSeoMetadata): void {
  if (typeof document === 'undefined') return;
  document.title = meta.seoTitle;
  upsertMetaByName('description', meta.metaDescription);
  upsertMetaByName('robots', meta.robots);
  upsertCanonicalLink(meta.canonicalUrl);

  upsertMetaByProperty('og:title', meta.ogTitle);
  upsertMetaByProperty('og:description', meta.ogDescription);
  upsertMetaByProperty('og:type', meta.ogType);
  upsertMetaByProperty('og:url', meta.canonicalUrl);
  upsertMetaByProperty('og:site_name', meta.ogSiteName);
  upsertMetaByProperty('og:image', meta.ogImage);

  upsertMetaByName('twitter:card', meta.twitterCard);
  upsertMetaByName('twitter:title', meta.twitterTitle);
  upsertMetaByName('twitter:description', meta.twitterDescription);
  upsertMetaByName('twitter:image', meta.twitterImage);

  upsertStructuredData(meta.structuredData);
}
