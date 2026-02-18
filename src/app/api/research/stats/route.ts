import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0; // no cache

const TOPIC_TERMS = [
  { label: 'iPSC', slug: 'ipsc', pattern: '%ipsc%' },
  { label: 'HSC', slug: 'hematopoietic-stem-cells', pattern: '%hematopoietic stem cell%' },
  { label: 'CAR-T', slug: 'car-t', pattern: '%car-t%' },
  { label: 'MSC', slug: 'mesenchymal-stem-cells', pattern: '%mesenchymal%' },
  { label: 'Organoids', slug: 'organoids', pattern: '%organoid%' },
  { label: 'CRISPR', slug: 'crispr', pattern: '%crispr%' },
  { label: 'Gene Therapy', slug: 'gene-therapy', pattern: '%gene therapy%' },
  { label: 'Regenerative Medicine', slug: 'regenerative-medicine', pattern: '%regenerative%' },
  { label: 'Exosomes', slug: 'exosomes', pattern: '%exosome%' },
  { label: 'Neural Stem Cells', slug: 'neural-stem-cells', pattern: '%neural stem%' },
  { label: 'Differentiation', slug: 'differentiation', pattern: '%differentiation%' },
  { label: 'Reprogramming', slug: 'reprogramming', pattern: '%reprogram%' },
  { label: 'Menstrual Stem Cells', slug: 'menstrual-stem-cells', pattern: '%menstrual%' },
];

export async function GET() {
  const supabase = createAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  // Core counts — parallel
  const [
    { count: papersWeek },
    { count: trialsWeek },
    { count: regulatoryWeek },
    { count: totalPapers },
    { count: totalPublished },
    { data: trending },
  ] = await Promise.all([
    supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .gte('fetched_at', cutoff)
      .or('source_type.is.null,source_type.eq.journal'),
    supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .gte('fetched_at', cutoff)
      .eq('source_type', 'trial'),
    supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .gte('fetched_at', cutoff)
      .eq('source_type', 'news'),
    supabase
      .from('papers')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'blog_post')
      .eq('status', 'published'),
    supabase
      .from('papers')
      .select('id, title, journal_name, citation_count, abstract, keywords')
      .order('citation_count', { ascending: false })
      .limit(20),
  ]);

  // Filter routine heme-malignancy papers from trending
  const HEME_FILTER = /\bmyeloma\b|\bleu[ck]?[ae]?mia\b|\blymphoma\b|\bmyelodysplastic\b|\bmyelofibrosis\b|\bgvhd\b|\bgraft[- ]versus[- ]host/i;
  const NOVELTY_SIGNAL = /\bcar[- ]?t\b|\bcrispr\b|\bgene\s+edit|\bgene\s+therap|\bipsc?\b|\binduced\s+pluripotent|\bfirst[- ]in[- ]human|\bnovel\b|\bengineered\b|\breprogramm|\borganoid|\bregenerative/i;

  const filteredTrending = (trending || [])
    .filter((p) => {
      const text = [p.title, p.abstract || '', (p.keywords || []).join(' ')].join(' ');
      if (HEME_FILTER.test(text) && !NOVELTY_SIGNAL.test(text)) return false;
      return true;
    })
    .slice(0, 5)
    .map(({ id, title, journal_name, citation_count }) => ({ id, title, journal_name, citation_count }));

  // Topic counts — parallel
  const topicCounts = await Promise.all(
    TOPIC_TERMS.map(async ({ label, slug, pattern }) => {
      const { count } = await supabase
        .from('papers')
        .select('*', { count: 'exact', head: true })
        .or(`title.ilike.${pattern},abstract.ilike.${pattern}`);
      return { label, slug, count: count ?? 0 };
    })
  );

  const topics = topicCounts
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    papersWeek: papersWeek ?? 0,
    trialsWeek: trialsWeek ?? 0,
    regulatoryWeek: regulatoryWeek ?? 0,
    totalPapers: totalPapers ?? 0,
    totalPublished: totalPublished ?? 0,
    trending: filteredTrending,
    topics,
    updatedAt: new Date().toISOString(),
  });
}
