import { searchPubMed, fetchPubMedArticles, buildStemCellQuery, type PubMedArticle } from './pubmed';
import { searchCrossRef, type CrossRefWork } from './crossref';
import { searchOpenAlex, type OpenAlexWork } from './openalex';
import { searchClinicalTrials, type ClinicalTrial } from './clinicaltrials';
import { searchFdaApprovals, type FdaRecord } from './fda';
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
  source_type?: string;
  evidence_level?: string;
  trial_id?: string;
}

export async function fetchAndUpsertPapers(): Promise<{ fetched: number; upserted: number }> {
  const fromDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  // Fetch from all five sources in parallel
  const [pubmedArticles, crossrefWorks, openalexWorks, clinicalTrials, fdaRecords] = await Promise.allSettled([
    fetchFromPubMed(),
    fetchFromCrossRef(fromDate),
    fetchFromOpenAlex(fromDate),
    fetchFromClinicalTrials(),
    fetchFromFda(),
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

  if (clinicalTrials.status === 'fulfilled') {
    papers.push(...clinicalTrials.value.map(normalizeClinicalTrial));
  }

  if (fdaRecords.status === 'fulfilled') {
    papers.push(...fdaRecords.value.map(normalizeFdaRecord));
  }

  // Deduplicate by trial_id, DOI, or title
  const deduped = deduplicatePapers(papers);

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

async function fetchFromClinicalTrials(): Promise<ClinicalTrial[]> {
  return searchClinicalTrials(50);
}

async function fetchFromFda(): Promise<FdaRecord[]> {
  return searchFdaApprovals(50);
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
    source_type: 'journal',
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
    source_type: 'journal',
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
    source_type: 'journal',
  };
}

function normalizeClinicalTrial(trial: ClinicalTrial): NormalizedPaper {
  const conditions = trial.conditions.length > 0 ? trial.conditions.join('; ') : '';
  const interventionText = trial.interventions.length > 0 ? trial.interventions.join('; ') : '';

  const summaryParts = [trial.summary || ''];
  if (trial.phase) summaryParts.push(`Phase: ${trial.phase}`);
  if (trial.status) summaryParts.push(`Status: ${trial.status}`);
  if (conditions) summaryParts.push(`Conditions: ${conditions}`);
  if (interventionText) summaryParts.push(`Interventions: ${interventionText}`);

  return {
    title: trial.title,
    abstract: summaryParts.filter(Boolean).join('\n'),
    authors: trial.sponsor ? [trial.sponsor] : [],
    journal_name: 'ClinicalTrials.gov',
    published_date: trial.lastUpdateDate || trial.startDate,
    citation_count: 0,
    source_url: `https://clinicaltrials.gov/study/${trial.nctId}`,
    keywords: trial.conditions,
    mesh_terms: [],
    source_type: 'trial',
    evidence_level: 'clinical-trial',
    trial_id: trial.nctId,
  };
}

function normalizeFdaRecord(record: FdaRecord): NormalizedPaper {
  const title = [
    record.brandName,
    record.genericName ? `(${record.genericName})` : null,
    record.actionType ? `- ${record.actionType}` : null,
  ].filter(Boolean).join(' ') || `FDA ${record.applicationNumber}`;

  const abstractParts = [];
  if (record.submissionType) abstractParts.push(`Submission Type: ${record.submissionType}`);
  if (record.submissionStatus) abstractParts.push(`Status: ${record.submissionStatus}`);
  if (record.sponsorName) abstractParts.push(`Sponsor: ${record.sponsorName}`);
  if (record.actionDate) abstractParts.push(`Action Date: ${record.actionDate}`);

  return {
    title,
    abstract: abstractParts.join('\n') || undefined,
    authors: record.sponsorName ? [record.sponsorName] : [],
    journal_name: 'FDA',
    published_date: record.actionDate,
    citation_count: 0,
    source_url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${record.applicationNumber.replace(/[^0-9]/g, '')}`,
    keywords: [],
    mesh_terms: [],
    source_type: 'news',
    evidence_level: 'regulatory',
    trial_id: record.applicationNumber,
  };
}

function deduplicatePapers(papers: NormalizedPaper[]): NormalizedPaper[] {
  const seen = new Map<string, NormalizedPaper>();

  for (const paper of papers) {
    // First check trial_id as dedup key
    if (paper.trial_id) {
      const trialKey = `trial:${paper.trial_id.toLowerCase()}`;
      if (!seen.has(trialKey)) {
        seen.set(trialKey, paper);
      } else {
        mergePaper(seen.get(trialKey)!, paper);
      }
      continue;
    }

    // Then DOI
    if (paper.doi) {
      const doiKey = `doi:${paper.doi.toLowerCase()}`;
      if (!seen.has(doiKey)) {
        seen.set(doiKey, paper);
      } else {
        mergePaper(seen.get(doiKey)!, paper);
      }
      continue;
    }

    // Fall back to title similarity
    const titleKey = `title:${paper.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (!seen.has(titleKey)) {
      seen.set(titleKey, paper);
    } else {
      mergePaper(seen.get(titleKey)!, paper);
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
    const row = {
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
      source_type: paper.source_type || 'journal',
      evidence_level: paper.evidence_level,
      trial_id: paper.trial_id,
    };

    // For records with a trial_id but no DOI, use select-then-insert/update
    // since the DOI-based upsert won't work for them
    if (paper.trial_id && !paper.doi) {
      const { data: existing } = await supabase
        .from('papers')
        .select('id')
        .eq('trial_id', paper.trial_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('papers')
          .update(row)
          .eq('id', existing.id);
        if (!error) upserted++;
      } else {
        const { error } = await supabase
          .from('papers')
          .insert(row);
        if (!error) upserted++;
      }
      continue;
    }

    const { error } = await supabase
      .from('papers')
      .upsert(row, {
        onConflict: 'doi',
        ignoreDuplicates: false,
      });

    if (!error) upserted++;
  }

  return upserted;
}
