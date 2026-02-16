import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function zTest(p1: number, n1: number, p2: number, n2: number): { zScore: number; pValue: number } {
  if (n1 === 0 || n2 === 0) return { zScore: 0, pValue: 1 };
  const p = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (se === 0) return { zScore: 0, pValue: 1 };
  const z = (p1 - p2) / se;
  // Approximate two-tailed p-value using normal CDF
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return { zScore: z, pValue };
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

export async function GET(request: Request) {
  // Auth check - admin only
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Get all content with ab_preset metadata
  const { data: allContent } = await admin
    .from('content')
    .select('id, title, slug, metadata')
    .eq('content_type', 'blog_post')
    .eq('status', 'published');

  const preset1Content: string[] = [];
  const preset2Content: string[] = [];
  const contentMap = new Map<string, { title: string; slug: string; preset: string }>();

  for (const c of allContent || []) {
    const preset = (c.metadata as Record<string, unknown>)?.ab_preset as string;
    if (preset === 'preset_1') {
      preset1Content.push(c.id);
      contentMap.set(c.id, { title: c.title || '', slug: c.slug || '', preset: 'preset_1' });
    } else if (preset === 'preset_2') {
      preset2Content.push(c.id);
      contentMap.set(c.id, { title: c.title || '', slug: c.slug || '', preset: 'preset_2' });
    }
  }

  // Get aggregated stats for each group
  const allIds = [...preset1Content, ...preset2Content];
  const { data: stats } = await admin
    .from('daily_content_stats')
    .select('*')
    .in('content_id', allIds.length > 0 ? allIds : ['00000000-0000-0000-0000-000000000000']);

  function aggregateGroup(ids: string[]) {
    const idSet = new Set(ids);
    const groupStats = (stats || []).filter((s) => idSet.has(s.content_id));
    const totalViews = groupStats.reduce((sum, s) => sum + s.views, 0);
    const totalShares = groupStats.reduce((sum, s) => sum + s.shares, 0);
    const totalBookmarks = groupStats.reduce((sum, s) => sum + s.bookmarks, 0);
    const totalUniqueVisitors = groupStats.reduce((sum, s) => sum + s.unique_visitors, 0);
    const daysCount = groupStats.length || 1;
    const avgScrollDepth = groupStats.reduce((sum, s) => sum + s.avg_scroll_depth, 0) / daysCount;
    const avgTimeOnPage = groupStats.reduce((sum, s) => sum + s.avg_time_on_page, 0) / daysCount;
    const shareRate = totalViews > 0 ? totalShares / totalViews : 0;
    const bookmarkRate = totalViews > 0 ? totalBookmarks / totalViews : 0;
    const engagementRate = totalViews > 0 ? (totalShares + totalBookmarks) / totalViews : 0;

    return {
      contentCount: ids.length,
      totalViews,
      totalUniqueVisitors,
      totalShares,
      totalBookmarks,
      avgScrollDepth,
      avgTimeOnPage,
      shareRate,
      bookmarkRate,
      engagementRate,
    };
  }

  const preset1Stats = aggregateGroup(preset1Content);
  const preset2Stats = aggregateGroup(preset2Content);

  // Statistical significance test on engagement rate
  const significance = zTest(
    preset1Stats.engagementRate,
    preset1Stats.totalViews,
    preset2Stats.engagementRate,
    preset2Stats.totalViews
  );

  let significanceLevel: 'significant' | 'trending' | 'insufficient';
  if (preset1Stats.totalViews < 30 || preset2Stats.totalViews < 30) {
    significanceLevel = 'insufficient';
  } else if (significance.pValue < 0.05) {
    significanceLevel = 'significant';
  } else if (significance.pValue < 0.1) {
    significanceLevel = 'trending';
  } else {
    significanceLevel = 'insufficient';
  }

  // Per-content breakdown
  const contentBreakdown = allIds.map((id) => {
    const contentInfo = contentMap.get(id);
    const contentDayStats = (stats || []).filter((s) => s.content_id === id);
    const views = contentDayStats.reduce((sum, s) => sum + s.views, 0);
    const shares = contentDayStats.reduce((sum, s) => sum + s.shares, 0);
    const bookmarks = contentDayStats.reduce((sum, s) => sum + s.bookmarks, 0);
    const days = contentDayStats.length || 1;
    return {
      content_id: id,
      title: contentInfo?.title || '',
      slug: contentInfo?.slug || '',
      preset: contentInfo?.preset || '',
      views,
      shares,
      bookmarks,
      avgScrollDepth: contentDayStats.reduce((sum, s) => sum + s.avg_scroll_depth, 0) / days,
      avgTimeOnPage: contentDayStats.reduce((sum, s) => sum + s.avg_time_on_page, 0) / days,
    };
  });

  return NextResponse.json({
    preset_1: preset1Stats,
    preset_2: preset2Stats,
    significance: {
      zScore: significance.zScore,
      pValue: significance.pValue,
      level: significanceLevel,
    },
    contentBreakdown,
  });
}
