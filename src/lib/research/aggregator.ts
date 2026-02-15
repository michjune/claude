import { searchPubMed, fetchPubMedArticles, buildStemCellQuery, type PubMedArticle } from './pubmed';
import { searchCrossRef, type CrossRefWork } from './crossref';
import { searchOpenAlex, type OpenAlexWork } from './openalex';
import { getJournalNames, getJournalISSNs, getOpenAlexSourceIds } from './journals';
import { createAdminClient } from '@/lib/supabase/admin';
import { format, subDays } from 'date-fns';

export interface NormalizedPaper {
  title: string;
  abstract?: string;
  authors: string[];
  journal_name?: string;
  doi?: string;
  pmid?: string;
  openalex_id?: string;
  published_date?: string;
  citation_count: number;
  source_url?: string;
  keywords: string[];
  mesh_terms: string[];
}

export async function fetchAndUpsertPapers(): Promise<{ fetched: number; upserted: number }> {
  const fromDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  // Fetch from all three sources in parallel
  const [pubmedArticles, crossrefWorks, openalexWorks] = await Promise.allSettled([
    fetchFromPubMed(),
    fetchFromCrossRef(fromDate),
    fetchFromOpenAlex(fromDate),
  ]);

  const papers: NormalizedPaper[] = [];

  if (pubmedArticles.status === 'fulfilled') {
    papers.push(...pubmedArticles.value.map(normalizePubMed));
  }

  if (crossrefWorks.status === 'fulfilled') {
    papers.push(...crossrefWorks.value.map(normalizeCrossRef));
  }

  if (openalexWorks.status === 'fulfilled') {
    papers.push(...openalexWorks.value.map(normalizeOpenAlex));
  }

  // Deduplicate by DOI
  const deduped = deduplicateByDoi(papers);

  // Upsert to database
  const upserted = await upsertPapers(deduped);

  return { fetched: papers.length, upserted };
}

async function fetchFromPubMed(): Promise<PubMedArticle[]> {
  const query = buildStemCellQuery(getJournalNames());
  const pmids = await searchPubMed(query, 100);
  return fetchPubMedArticles(pmids);
}

async function fetchFromCrossRef(fromDate: string): Promise<CrossRefWork[]> {
  return searchCrossRef('stem cell OR iPSC OR regenerative medicine', {
    rows: 100,
    issns: getJournalISSNs(),
    fromDate,
  });
}

async function fetchFromOpenAlex(fromDate: string): Promise<OpenAlexWork[]> {
  return searchOpenAlex('stem cell OR iPSC OR regenerative medicine', {
    perPage: 100,
    sourceIds: getOpenAlexSourceIds(),
    fromDate,
  });
}

function normalizePubMed(article: PubMedArticle): NormalizedPaper {
  return {
    title: article.title,
    abstract: article.abstract,
    authors: article.authors,
    journal_name: article.journal,
    doi: article.doi,
    pmid: article.pmid,
    published_date: article.publishedDate,
    citation_count: 0,
    source_url: article.doi ? `https://doi.org/${article.doi}` : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}`,
    keywords: article.keywords,
    mesh_terms: article.meshTerms,
  };
}

function normalizeCrossRef(work: CrossRefWork): NormalizedPaper {
  return {
    title: work.title,
    abstract: work.abstract,
    authors: work.authors,
    journal_name: work.journal,
    doi: work.doi,
    published_date: work.publishedDate,
    citation_count: work.citationCount,
    source_url: work.sourceUrl,
    keywords: [],
    mesh_terms: [],
  };
}

function normalizeOpenAlex(work: OpenAlexWork): NormalizedPaper {
  return {
    title: work.title,
    abstract: work.abstract,
    authors: work.authors,
    journal_name: work.journal,
    doi: work.doi,
    pmid: work.pmid,
    openalex_id: work.openalexId,
    published_date: work.publishedDate,
    citation_count: work.citationCount,
    source_url: work.sourceUrl,
    keywords: work.keywords,
    mesh_terms: [],
  };
}

function deduplicateByDoi(papers: NormalizedPaper[]): NormalizedPaper[] {
  const seen = new Map<string, NormalizedPaper>();
  const noDoi: NormalizedPaper[] = [];

  for (const paper of papers) {
    if (!paper.doi) {
      // For papers without DOI, deduplicate by title similarity
      const titleKey = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(titleKey)) {
        seen.set(titleKey, paper);
        noDoi.push(paper);
      } else {
        // Merge: prefer the one with more data
        const existing = seen.get(titleKey)!;
        mergePaper(existing, paper);
      }
    } else {
      const doiKey = paper.doi.toLowerCase();
      if (!seen.has(doiKey)) {
        seen.set(doiKey, paper);
      } else {
        const existing = seen.get(doiKey)!;
        mergePaper(existing, paper);
      }
    }
  }

  return Array.from(seen.values());
}

function mergePaper(target: NormalizedPaper, source: NormalizedPaper): void {
  if (!target.abstract && source.abstract) target.abstract = source.abstract;
  if (!target.pmid && source.pmid) target.pmid = source.pmid;
  if (!target.openalex_id && source.openalex_id) target.openalex_id = source.openalex_id;
  if (!target.doi && source.doi) target.doi = source.doi;
  if (source.citation_count > target.citation_count) target.citation_count = source.citation_count;
  if (source.keywords.length > target.keywords.length) target.keywords = source.keywords;
  if (source.mesh_terms.length > target.mesh_terms.length) target.mesh_terms = source.mesh_terms;
  if (source.authors.length > target.authors.length) target.authors = source.authors;
}

async function upsertPapers(papers: NormalizedPaper[]): Promise<number> {
  const supabase = createAdminClient();
  let upserted = 0;

  for (const paper of papers) {
    const { error } = await supabase
      .from('papers')
      .upsert(
        {
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors,
          journal_name: paper.journal_name,
          doi: paper.doi,
          pmid: paper.pmid,
          openalex_id: paper.openalex_id,
          published_date: paper.published_date,
          citation_count: paper.citation_count,
          source_url: paper.source_url,
          keywords: paper.keywords,
          mesh_terms: paper.mesh_terms,
        },
        {
          onConflict: 'doi',
          ignoreDuplicates: false,
        }
      );

    if (!error) upserted++;
  }

  return upserted;
}
