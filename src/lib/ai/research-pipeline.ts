import { generateStructuredContent } from './anthropic';
import type { Paper } from '@/lib/supabase/types';

export interface Reference {
  id: number;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string | null;
  relevance: string;
}

export interface LiteratureReview {
  references: Reference[];
  key_context: string;
  corroborating_findings: string[];
  contrasting_findings: string[];
  broader_context: string;
}

export interface FactCheckResult {
  issues: Array<{
    claim: string;
    verdict: 'accurate' | 'imprecise' | 'unsupported' | 'misleading';
    explanation: string;
    suggested_fix: string;
  }>;
  overall_accuracy: 'high' | 'medium' | 'low';
  missing_nuances: string[];
}

/** Bundled research results that all generators can consume */
export interface ResearchContext {
  literature: LiteratureReview;
  sourcePaperRef: string;
  verifiedFacts: string[];
}

/**
 * Run the full research pipeline for a paper:
 * 1. Fetch related papers from OpenAlex
 * 2. Analyze literature with Claude
 * Returns research context that all content generators can use.
 */
export async function runResearchPipeline(paper: Paper): Promise<ResearchContext> {
  console.log('[research] Fetching related papers from OpenAlex...');
  const literature = await crossReferenceLiterature(paper);

  const sourcePaperRef = `${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}. "${paper.title}" *${paper.journal_name || 'Journal'}* (${paper.published_date?.slice(0, 4) || 'N/A'})${paper.doi ? ` doi:${paper.doi}` : ''}`;

  // Build a list of verified facts from the source paper abstract
  const verifiedFacts: string[] = [];
  if (paper.abstract) {
    // Split abstract into sentences as verified claims
    const sentences = paper.abstract.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
    verifiedFacts.push(...sentences.slice(0, 8));
  }

  return { literature, sourcePaperRef, verifiedFacts };
}

/**
 * Fact-check any content draft against the source paper and literature.
 */
export async function factCheckContent(
  contentBody: string,
  contentTitle: string,
  paper: Paper,
  literature: LiteratureReview
): Promise<FactCheckResult> {
  const systemPrompt = `You are a rigorous scientific fact-checker specializing in stem cell research and regenerative medicine. Your job is to verify every factual claim in a content draft against the source paper and related literature.

For each claim, assess whether it is:
- "accurate": Correctly represents the source material
- "imprecise": Generally correct but lacks important nuance or qualification
- "unsupported": Cannot be verified from the provided sources
- "misleading": Misrepresents or overstates the findings

Also identify any important nuances the draft is missing.

Respond with valid JSON:
{
  "issues": [{ "claim": string, "verdict": "accurate"|"imprecise"|"unsupported"|"misleading", "explanation": string, "suggested_fix": string }],
  "overall_accuracy": "high"|"medium"|"low",
  "missing_nuances": [string]
}

Only flag actual issues - if a claim is accurate, do not include it. Focus on scientific accuracy.`;

  const refSummary = literature.references.length > 0
    ? `\n\nCROSS-REFERENCED LITERATURE:\n${literature.references.map(r => `- ${r.title} (${r.authors}, ${r.journal} ${r.year}): ${r.relevance}`).join('\n')}\n\nCorroborating findings: ${literature.corroborating_findings.join('; ')}\nContrasting findings: ${literature.contrasting_findings.join('; ')}`
    : '';

  const userPrompt = `SOURCE PAPER:
Title: ${paper.title}
Abstract: ${paper.abstract || 'N/A'}
Authors: ${paper.authors.join(', ')}
Journal: ${paper.journal_name || 'N/A'}
Keywords: ${paper.keywords.join(', ')}
${refSummary}

CONTENT DRAFT TO FACT-CHECK:
Title: ${contentTitle}

${contentBody}

Please fact-check every scientific claim in this draft.`;

  return generateStructuredContent<FactCheckResult>(systemPrompt, userPrompt, {
    temperature: 0.2,
    maxTokens: 3000,
  });
}

/**
 * Build a research context summary string for injection into any generator prompt.
 */
export function buildResearchSummary(research: ResearchContext): string {
  const { literature } = research;
  if (literature.references.length === 0) return '';

  const parts: string[] = [
    '\n\nVERIFIED RESEARCH CONTEXT (use this to ensure accuracy):',
    `Source paper: ${research.sourcePaperRef}`,
  ];

  if (literature.key_context) {
    parts.push(`\nBackground: ${literature.key_context}`);
  }

  if (literature.corroborating_findings.length > 0) {
    parts.push(`\nCorroborating findings from other research:\n${literature.corroborating_findings.map(f => `- ${f}`).join('\n')}`);
  }

  if (literature.contrasting_findings.length > 0) {
    parts.push(`\nImportant nuances/contrasts:\n${literature.contrasting_findings.map(f => `- ${f}`).join('\n')}`);
  }

  if (literature.broader_context) {
    parts.push(`\nBroader context: ${literature.broader_context}`);
  }

  if (literature.references.length > 0) {
    parts.push(`\nKey references:\n${literature.references.slice(0, 5).map(r => `- ${r.authors}, "${r.title}" (${r.journal}, ${r.year})`).join('\n')}`);
  }

  parts.push('\nIMPORTANT: Every factual claim must be supported by the source paper or references above. Do not overstate findings. Note limitations where appropriate.');

  return parts.join('\n');
}

// ──────────────────────────────────────────────
// OpenAlex API helpers
// ──────────────────────────────────────────────

async function crossReferenceLiterature(paper: Paper): Promise<LiteratureReview> {
  const relatedPapers = await fetchRelatedPapers(paper);

  if (relatedPapers.length === 0) {
    return {
      references: [],
      key_context: '',
      corroborating_findings: [],
      contrasting_findings: [],
      broader_context: '',
    };
  }

  const systemPrompt = `You are a biomedical research analyst. Given a primary paper and a list of related papers, produce a structured literature review that identifies:
1. Key contextual background for the primary paper's findings
2. Corroborating findings from other research
3. Contrasting or nuanced findings
4. Broader context for why this research matters

Format each reference with: title, authors (first author et al.), journal, year, DOI, and a one-sentence relevance note.

Always respond with valid JSON matching this format:
{
  "references": [{ "id": number, "title": string, "authors": string, "journal": string, "year": string, "doi": string|null, "relevance": string }],
  "key_context": string,
  "corroborating_findings": [string],
  "contrasting_findings": [string],
  "broader_context": string
}`;

  const userPrompt = `PRIMARY PAPER:
Title: ${paper.title}
Abstract: ${paper.abstract || 'N/A'}
Authors: ${paper.authors.join(', ')}
Journal: ${paper.journal_name || 'N/A'}
DOI: ${paper.doi || 'N/A'}

RELATED PAPERS FOUND:
${relatedPapers.map((p, i) => `${i + 1}. "${p.title}" by ${p.authors} (${p.journal}, ${p.year}) DOI: ${p.doi || 'N/A'}${p.abstract ? `\n   Abstract: ${p.abstract}` : ''}`).join('\n\n')}

Analyze these related papers in context of the primary paper. Identify which findings corroborate, contrast, or provide broader context. Select the most relevant 5-8 papers as references.`;

  return generateStructuredContent<LiteratureReview>(systemPrompt, userPrompt, {
    temperature: 0.3,
    maxTokens: 3000,
  });
}

async function fetchRelatedPapers(paper: Paper): Promise<Array<{
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string | null;
  abstract: string | null;
}>> {
  const results: Array<{
    title: string;
    authors: string;
    journal: string;
    year: string;
    doi: string | null;
    abstract: string | null;
  }> = [];

  try {
    if (paper.doi) {
      const doiEncoded = encodeURIComponent(paper.doi);
      const url = `https://api.openalex.org/works?filter=cites:https://doi.org/${doiEncoded}&per_page=10&sort=cited_by_count:desc&select=title,authorships,primary_location,publication_year,doi,abstract_inverted_index`;
      const citingPapers = await fetchOpenAlex(url);
      results.push(...citingPapers);
    }

    const searchTerms = paper.keywords.length > 0
      ? paper.keywords.slice(0, 3).join(' ')
      : paper.title.split(' ').slice(0, 6).join(' ');

    const searchUrl = `https://api.openalex.org/works?search=${encodeURIComponent(searchTerms)}&filter=type:journal-article,from_publication_date:2020-01-01&per_page=10&sort=cited_by_count:desc&select=title,authorships,primary_location,publication_year,doi,abstract_inverted_index`;
    const searchResults = await fetchOpenAlex(searchUrl);

    const seenDois = new Set(results.map(r => r.doi).filter(Boolean));
    if (paper.doi) seenDois.add(paper.doi);

    for (const r of searchResults) {
      if (r.doi && seenDois.has(r.doi)) continue;
      if (r.doi) seenDois.add(r.doi);
      results.push(r);
    }
  } catch (err) {
    console.error('[research] Error fetching related papers:', err);
  }

  return results.slice(0, 15);
}

async function fetchOpenAlex(url: string): Promise<Array<{
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string | null;
  abstract: string | null;
}>> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'StemCellPulse/1.0 (mailto:contact@stemcellpulse.com)' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((work: Record<string, unknown>) => {
      let abstract: string | null = null;
      const invertedIndex = work.abstract_inverted_index as Record<string, number[]> | null;
      if (invertedIndex) {
        const words: Array<[string, number]> = [];
        for (const [word, positions] of Object.entries(invertedIndex)) {
          for (const pos of positions as number[]) {
            words.push([word, pos]);
          }
        }
        words.sort((a, b) => a[1] - b[1]);
        abstract = words.map(w => w[0]).join(' ');
        if (abstract.length > 500) abstract = abstract.slice(0, 500) + '...';
      }

      const authorships = work.authorships as Array<{ author: { display_name: string } }> | undefined;
      const firstAuthor = authorships?.[0]?.author?.display_name || 'Unknown';
      const authorStr = authorships && authorships.length > 1
        ? `${firstAuthor} et al.`
        : firstAuthor;

      const primaryLocation = work.primary_location as { source?: { display_name?: string } } | null;

      return {
        title: (work.title as string) || 'Untitled',
        authors: authorStr,
        journal: primaryLocation?.source?.display_name || 'Unknown Journal',
        year: String(work.publication_year || 'N/A'),
        doi: work.doi ? (work.doi as string).replace('https://doi.org/', '') : null,
        abstract,
      };
    });
  } catch {
    return [];
  }
}
