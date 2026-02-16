const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stemcellpulse.com';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'StemCell Pulse',
        url: BASE_URL,
        logo: `${BASE_URL}/logo.png`,
        description:
          'AI-powered stem cell research summaries from high-impact journals.',
        sameAs: [],
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'StemCell Pulse',
        url: BASE_URL,
        description:
          'AI-powered stem cell research summaries from high-impact journals.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  );
}

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  datePublished: string;
  dateModified?: string;
  keywords?: string[];
  wordCount?: number;
  articleSection?: string;
}

export function ArticleJsonLd({
  title,
  description,
  url,
  imageUrl,
  datePublished,
  dateModified,
  keywords,
  wordCount,
  articleSection,
}: ArticleJsonLdProps) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        ...(imageUrl && { image: imageUrl }),
        datePublished,
        dateModified: dateModified || datePublished,
        author: {
          '@type': 'Organization',
          name: 'StemCell Pulse',
          url: BASE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: 'StemCell Pulse',
          url: BASE_URL,
          logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
        },
        ...(keywords && keywords.length > 0 && { keywords: keywords.join(', ') }),
        ...(wordCount && { wordCount }),
        ...(articleSection && { articleSection }),
      }}
    />
  );
}

interface BreadcrumbJsonLdProps {
  items: { name: string; url: string }[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

interface CollectionPageJsonLdProps {
  name: string;
  description: string;
  url: string;
}

export function CollectionPageJsonLd({
  name,
  description,
  url,
}: CollectionPageJsonLdProps) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        description,
        url,
      }}
    />
  );
}
