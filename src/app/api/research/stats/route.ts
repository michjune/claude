import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0; // no cache

const TOPIC_TERMS = [
  { label: 'iPSC', pattern: '%ipsc%' },
  { label: 'HSC', pattern: '%hematopoietic stem cell%' },
  { label: 'CAR-T', pattern: '%car-t%' },
  { label: 'MSC', pattern: '%mesenchymal%' },
  { label: 'Organoids', pattern: '%organoid%' },
  { label: 'CRISPR', pattern: '%crispr%' },
  { label: 'Gene Therapy', pattern: '%gene therapy%' },
  { label: 'Regenerative Medicine', pattern: '%regenerative%' },
  { label: 'Exosomes', pattern: '%exosome%' },
  { label: 'Neural Stem Cells', pattern: '%neural stem%' },
  { label: 'Differentiation', pattern: '%differentiation%' },
  { label: 'Reprogramming', pattern: '%reprogram%' },
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
      .select('id, title, journal_name, citation_count')
      .order('citation_count', { ascending: false })
      .limit(5),
  ]);

  // Topic counts — parallel
  const topicCounts = await Promise.all(
    TOPIC_TERMS.map(async ({ label, pattern }) => {
      const { count } = await supabase
        .from('papers')
        .select('*', { count: 'exact', head: true })
        .or(`title.ilike.${pattern},abstract.ilike.${pattern}`);
      return { label, count: count ?? 0 };
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
    trending: trending ?? [],
    topics,
    updatedAt: new Date().toISOString(),
  });
}
