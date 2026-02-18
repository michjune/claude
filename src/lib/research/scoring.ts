import { TARGET_JOURNALS } from './journals';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedPaper } from './aggregator';

// --- Journal Tier Scoring ---

const JOURNAL_TIER_MAP: Record<string, number> = {};

// Build tier map from TARGET_JOURNALS using impact factor buckets
for (const j of TARGET_JOURNALS) {
  const name = j.name.toLowerCase();
  const IF = j.impactFactor ?? 0;
  let tier: number;
  if (IF >= 100) tier = 100;       // NEJM, Lancet
  else if (IF >= 50) tier = 90;    // Nature, Cell, Science
  else if (IF >= 40) tier = 75;    // Nature Biotechnology
  else if (IF >= 20) tier = 75;    // Nature Medicine, Cell Stem Cell, Nature Cell Bio, Blood
  else if (IF >= 15) tier = 60;    // Nature Comms, Sci Transl Med, JCI, Molecular Cell
  else if (IF >= 10) tier = 50;    // Developmental Cell, EMBO Journal
  else if (IF >= 7) tier = 45;     // Cell Reports, Stem Cell Research & Therapy
  else tier = 30;                  // Stem Cells, Stem Cell Reports
  JOURNAL_TIER_MAP[name] = tier;
}

export function scoreJournalTier(journalName: string | null | undefined): number {
  if (!journalName) return 20;
  const lower = journalName.toLowerCase();
  // Exact match first
  if (JOURNAL_TIER_MAP[lower] !== undefined) return JOURNAL_TIER_MAP[lower];
  // Partial match (e.g. "The New England Journal of Medicine" contains "new england journal of medicine")
  for (const [key, tier] of Object.entries(JOURNAL_TIER_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return tier;
  }
  // Special cases for FDA / ClinicalTrials
  if (lower === 'fda') return 70;
  if (lower.includes('clinicaltrials')) return 40;
  return 20;
}

// --- Citation Scoring ---

export function scoreCitations(count: number): number {
  if (count <= 0) return 0;
  // log2 scaling: 1→20, 4→60, 16+→100
  const score = 20 * Math.log2(count + 1);
  return Math.min(100, score);
}

// --- Scientific Authority (combined) ---

function scoreScientificAuthority(journalName: string | null | undefined, citationCount: number): number {
  return 0.6 * scoreJournalTier(journalName) + 0.4 * scoreCitations(citationCount);
}

// --- Evidence Strength ---

export function scoreEvidence(paper: NormalizedPaper): number {
  let base: number;

  switch (paper.evidence_level) {
    case 'regulatory': base = 85; break;
    case 'clinical-trial': base = 60; break;
    default: base = paper.source_type === 'journal' ? 50 : 30;
  }

  // Boost clinical trials by phase
  if (paper.evidence_level === 'clinical-trial' && paper.abstract) {
    const phaseMatch = paper.abstract.match(/Phase:\s*(Phase\s*)?(\d)/i)
      || paper.title.match(/phase\s*(\d)/i);
    if (phaseMatch) {
      const phase = parseInt(phaseMatch[phaseMatch.length - 1]);
      if (phase >= 4) base = 95;
      else if (phase >= 3) base = 90;
      else if (phase >= 2) base = 75;
    }
  }

  // Boost by trial status
  if (paper.abstract) {
    const statusLower = paper.abstract.toLowerCase();
    if (statusLower.includes('status: completed')) base = Math.min(100, base + 10);
    else if (statusLower.includes('status: recruiting') || statusLower.includes('status: active')) base = Math.min(100, base + 5);
  }

  return Math.min(100, base);
}

// --- Recency ---

export function scoreRecency(publishedDate: string | null | undefined): number {
  if (!publishedDate) return 25;
  const ageDays = (Date.now() - new Date(publishedDate).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 0) return 100; // future date = just published
  return 100 * Math.pow(0.5, ageDays / 7);
}

// --- Content Signals ---

const SIGNAL_PATTERNS: Array<{ pattern: RegExp; boost: number }> = [
  { pattern: /\bfda\s+approv/i, boost: 25 },
  { pattern: /\bfirst[- ]in[- ]human\b/i, boost: 25 },
  { pattern: /\bcrispr\b/i, boost: 20 },
  { pattern: /\bcure[ds]?\b/i, boost: 20 },
  { pattern: /\banti[- ]?aging\b|\baging\b|\blongevity\b|\brejuvenat/i, boost: 20 },
  { pattern: /\balzheimer/i, boost: 18 },
  { pattern: /\bcar[- ]?t\b/i, boost: 18 },
  { pattern: /\bcancer\b|\btumor\b|\boncolog/i, boost: 15 },
  { pattern: /\bremission\b/i, boost: 15 },
  { pattern: /\bbreakthrough\b/i, boost: 15 },
  { pattern: /\bparkinson/i, boost: 15 },
  { pattern: /\bdiabetes\b|\btype\s*1\s*diabetes/i, boost: 12 },
  { pattern: /\bheart\s+failure\b|\bcardiac\b/i, boost: 12 },
  { pattern: /\bspinal\s+cord\b/i, boost: 12 },
  { pattern: /\bblindness\b|\bretina/i, boost: 12 },
];

export function scoreContentSignals(paper: NormalizedPaper): number {
  const text = [paper.title, paper.abstract || ''].join(' ');
  let total = 0;
  for (const { pattern, boost } of SIGNAL_PATTERNS) {
    if (pattern.test(text)) total += boost;
  }
  return Math.min(100, total);
}

// --- Topic Virality ---

export type ViralityMap = Map<string, number>;

export async function buildTopicViralityMap(supabase: SupabaseClient): Promise<ViralityMap> {
  const map = new Map<string, number>();

  try {
    // Get engagement data: join content -> papers to get keywords, join content -> daily_content_stats for engagement
    const { data: stats } = await supabase
      .from('daily_content_stats')
      .select('content_id, views, shares, bookmarks');

    if (!stats || stats.length === 0) return map;

    // Aggregate engagement per content_id
    const contentEngagement = new Map<string, number>();
    for (const row of stats) {
      const engagement = (row.views || 0) + (row.shares || 0) * 5 + (row.bookmarks || 0) * 3;
      contentEngagement.set(
        row.content_id,
        (contentEngagement.get(row.content_id) || 0) + engagement
      );
    }

    // Also pull social post engagement
    const { data: socialStats } = await supabase
      .from('social_posts')
      .select('content_id, likes_count, shares_count, comments_count, views_count')
      .eq('status', 'published');

    if (socialStats) {
      for (const row of socialStats) {
        const engagement = (row.views_count || 0) + (row.likes_count || 0) * 2 + (row.shares_count || 0) * 5 + (row.comments_count || 0) * 3;
        contentEngagement.set(
          row.content_id,
          (contentEngagement.get(row.content_id) || 0) + engagement
        );
      }
    }

    // Map content_id -> paper keywords
    const contentIds = [...contentEngagement.keys()];
    if (contentIds.length === 0) return map;

    const { data: contentPapers } = await supabase
      .from('content')
      .select('id, paper_id')
      .in('id', contentIds)
      .not('paper_id', 'is', null);

    if (!contentPapers || contentPapers.length === 0) return map;

    const paperIds = [...new Set(contentPapers.map(c => c.paper_id).filter(Boolean))];
    const { data: papers } = await supabase
      .from('papers')
      .select('id, keywords, mesh_terms')
      .in('id', paperIds);

    if (!papers) return map;

    const paperKeywords = new Map<string, string[]>();
    for (const p of papers) {
      const terms = [...(p.keywords || []), ...(p.mesh_terms || [])].map((t: string) => t.toLowerCase());
      paperKeywords.set(p.id, terms);
    }

    // Build keyword -> total engagement
    const keywordEngagement = new Map<string, number>();
    for (const cp of contentPapers) {
      const engagement = contentEngagement.get(cp.id) || 0;
      const terms = paperKeywords.get(cp.paper_id) || [];
      for (const term of terms) {
        keywordEngagement.set(term, (keywordEngagement.get(term) || 0) + engagement);
      }
    }

    // Normalize to 0-100
    const maxEngagement = Math.max(...keywordEngagement.values(), 1);
    for (const [keyword, engagement] of keywordEngagement) {
      map.set(keyword, Math.round((engagement / maxEngagement) * 100));
    }
  } catch (err) {
    console.error('[scoring] Failed to build virality map:', err);
  }

  return map;
}

export function scoreTopicVirality(paper: NormalizedPaper, viralityMap: ViralityMap): number {
  if (viralityMap.size === 0) return 30;

  const terms = [...paper.keywords, ...paper.mesh_terms].map(t => t.toLowerCase());
  if (terms.length === 0) return 30;

  let maxScore = 0;
  let totalScore = 0;
  let matched = 0;

  for (const term of terms) {
    const score = viralityMap.get(term);
    if (score !== undefined) {
      maxScore = Math.max(maxScore, score);
      totalScore += score;
      matched++;
    }
  }

  if (matched === 0) return 30;
  // Blend: 60% top keyword score, 40% average of matched
  return Math.min(100, 0.6 * maxScore + 0.4 * (totalScore / matched));
}

// --- Combined Score ---

const WEIGHTS = {
  scientificAuthority: 0.25,
  evidenceStrength: 0.20,
  recency: 0.20,
  topicVirality: 0.20,
  contentSignals: 0.15,
};

export function calculatePriorityScore(paper: NormalizedPaper, viralityMap: ViralityMap): number {
  const authority = scoreScientificAuthority(paper.journal_name, paper.citation_count);
  const evidence = scoreEvidence(paper);
  const recency = scoreRecency(paper.published_date);
  const virality = scoreTopicVirality(paper, viralityMap);
  const signals = scoreContentSignals(paper);

  let score =
    WEIGHTS.scientificAuthority * authority +
    WEIGHTS.evidenceStrength * evidence +
    WEIGHTS.recency * recency +
    WEIGHTS.topicVirality * virality +
    WEIGHTS.contentSignals * signals;

  // Deprioritize traditional hematologic malignancy papers (myeloma, leukemia,
  // lymphoma) that passed the relevance filter. These are less interesting to
  // readers focused on novel stem cell therapies.
  const text = [paper.title, paper.abstract || ''].join(' ');
  if (/\bmyeloma\b|\bleu[ck]?[ae]?mia\b|\blymphoma\b|\bmyelodysplastic\b|\bgvhd\b|\bgraft[- ]versus[- ]host/i.test(text)) {
    score *= 0.7;
  }

  return Math.round(score * 100) / 100;
}
