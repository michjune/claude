import { z } from 'zod';

const CROSSREF_BASE = 'https://api.crossref.org';

export interface CrossRefWork {
  doi: string;
  title: string;
  abstract?: string;
  authors: string[];
  journal?: string;
  issn?: string[];
  publishedDate?: string;
  citationCount: number;
  sourceUrl?: string;
}

export async function searchCrossRef(
  query: string,
  options: { rows?: number; issns?: string[]; fromDate?: string } = {}
): Promise<CrossRefWork[]> {
  const { rows = 50, issns, fromDate } = options;

  const params = new URLSearchParams({
    query,
    rows: rows.toString(),
    sort: 'published',
    order: 'desc',
    'mailto': 'admin@stemcellpulse.com',
  });

  if (issns && issns.length > 0) {
    params.set('filter', issns.map((i) => `issn:${i}`).join(','));
  }

  if (fromDate) {
    const existing = params.get('filter');
    const dateFilter = `from-pub-date:${fromDate}`;
    params.set('filter', existing ? `${existing},${dateFilter}` : dateFilter);
  }

  const res = await fetch(`${CROSSREF_BASE}/works?${params}`, {
    headers: { 'User-Agent': 'StemCellPulse/1.0 (mailto:admin@stemcellpulse.com)' },
  });

  if (!res.ok) throw new Error(`CrossRef search failed: ${res.status}`);

  const data = await res.json();
  const items = data.message?.items || [];

  return items.map(parseWork).filter((w: CrossRefWork | null): w is CrossRefWork => w !== null);
}

export async function fetchByDoi(doi: string): Promise<CrossRefWork | null> {
  const res = await fetch(`${CROSSREF_BASE}/works/${encodeURIComponent(doi)}`, {
    headers: { 'User-Agent': 'StemCellPulse/1.0 (mailto:admin@stemcellpulse.com)' },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return parseWork(data.message);
}

function parseWork(item: Record<string, unknown>): CrossRefWork | null {
  if (!item) return null;

  const titleArr = item.title as string[] | undefined;
  const title = titleArr?.[0];
  if (!title) return null;

  const doi = item.DOI as string;
  const abstract = item.abstract as string | undefined;

  const authorArr = (item.author as Array<{ given?: string; family?: string }>) || [];
  const authors = authorArr.map((a) =>
    a.given ? `${a.given} ${a.family}` : a.family || 'Unknown'
  );

  const containerTitle = item['container-title'] as string[] | undefined;
  const journal = containerTitle?.[0];

  const issn = item.ISSN as string[] | undefined;

  const published = item.published as { 'date-parts'?: number[][] } | undefined;
  const dateParts = published?.['date-parts']?.[0];
  const publishedDate = dateParts
    ? `${dateParts[0]}-${String(dateParts[1] || 1).padStart(2, '0')}-${String(dateParts[2] || 1).padStart(2, '0')}`
    : undefined;

  const citationCount = (item['is-referenced-by-count'] as number) || 0;
  const sourceUrl = (item.URL as string) || (doi ? `https://doi.org/${doi}` : undefined);

  return {
    doi,
    title: cleanAbstract(title),
    abstract: abstract ? cleanAbstract(abstract) : undefined,
    authors,
    journal: journal ? cleanAbstract(journal) : undefined,
    issn,
    publishedDate,
    citationCount,
    sourceUrl,
  };
}

function cleanAbstract(text: string): string {
  return text
    .replace(/<jats:[^>]+>/g, '')
    .replace(/<\/jats:[^>]+>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}
