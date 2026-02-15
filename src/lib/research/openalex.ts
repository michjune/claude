const OPENALEX_BASE = 'https://api.openalex.org';

export interface OpenAlexWork {
  openalexId: string;
  doi?: string;
  pmid?: string;
  title: string;
  abstract?: string;
  authors: string[];
  journal?: string;
  publishedDate?: string;
  citationCount: number;
  sourceUrl?: string;
  keywords: string[];
}

export async function searchOpenAlex(
  query: string,
  options: { perPage?: number; sourceIds?: string[]; fromDate?: string } = {}
): Promise<OpenAlexWork[]> {
  const { perPage = 50, sourceIds, fromDate } = options;

  const filters: string[] = [];
  if (fromDate) filters.push(`from_publication_date:${fromDate}`);
  if (sourceIds && sourceIds.length > 0) {
    filters.push(`primary_location.source.id:${sourceIds.join('|')}`);
  }

  const params = new URLSearchParams({
    search: query,
    per_page: perPage.toString(),
    sort: 'publication_date:desc',
    mailto: 'admin@stemcellpulse.com',
  });

  if (filters.length > 0) {
    params.set('filter', filters.join(','));
  }

  const res = await fetch(`${OPENALEX_BASE}/works?${params}`);
  if (!res.ok) throw new Error(`OpenAlex search failed: ${res.status}`);

  const data = await res.json();
  const results = data.results || [];

  return results.map(parseOpenAlexWork).filter((w: OpenAlexWork | null): w is OpenAlexWork => w !== null);
}

function parseOpenAlexWork(item: Record<string, unknown>): OpenAlexWork | null {
  if (!item) return null;

  const title = item.display_name as string;
  if (!title) return null;

  const openalexId = item.id as string;
  const doi = item.doi as string | undefined;
  const cleanDoi = doi?.replace('https://doi.org/', '');

  // Extract PMID from ids
  const ids = item.ids as Record<string, string> | undefined;
  const pmidUrl = ids?.pmid;
  const pmid = pmidUrl?.replace('https://pubmed.ncbi.nlm.nih.gov/', '');

  // Extract abstract from inverted index
  const abstractIndex = item.abstract_inverted_index as Record<string, number[]> | undefined;
  const abstract = abstractIndex ? reconstructAbstract(abstractIndex) : undefined;

  // Authors
  const authorships = (item.authorships as Array<{ author: { display_name: string } }>) || [];
  const authors = authorships.map((a) => a.author?.display_name).filter(Boolean);

  // Journal
  const primaryLocation = item.primary_location as { source?: { display_name?: string } } | undefined;
  const journal = primaryLocation?.source?.display_name;

  const publishedDate = item.publication_date as string | undefined;
  const citationCount = (item.cited_by_count as number) || 0;

  // Keywords
  const keywordObjs = (item.keywords as Array<{ display_name: string }>) || [];
  const keywords = keywordObjs.map((k) => k.display_name);

  return {
    openalexId,
    doi: cleanDoi,
    pmid,
    title,
    abstract,
    authors,
    journal,
    publishedDate,
    citationCount,
    sourceUrl: cleanDoi ? `https://doi.org/${cleanDoi}` : undefined,
    keywords,
  };
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, word]) => word).join(' ');
}
