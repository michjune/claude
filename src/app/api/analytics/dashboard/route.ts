import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d';

  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 0 };
  const days = daysMap[period];
  if (days === undefined) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Build date filter
  const dateFilter = days
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : '2000-01-01';

  const dateFilterISO = days
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    : '2000-01-01T00:00:00.000Z';

  // Fetch daily site stats
  const siteStatsQuery = admin
    .from('daily_site_stats')
    .select('*')
    .gte('date', dateFilter)
    .order('date', { ascending: true });

  const { data: siteStats } = await siteStatsQuery;

  // Fetch top content
  const contentStatsQuery = admin
    .from('daily_content_stats')
    .select('*')
    .gte('date', dateFilter);

  const { data: contentStats } = await contentStatsQuery;

  // Fetch search term events (both search_referrer and site_search)
  const { data: searchEvents } = await admin
    .from('analytics_events')
    .select('event_type, event_data, content_id')
    .in('event_type', ['search_referrer', 'site_search'])
    .gte('created_at', dateFilterISO);

  // Aggregate content stats
  const contentAgg: Record<string, {
    content_id: string;
    views: number;
    unique_visitors: number;
    shares: number;
    bookmarks: number;
    avg_scroll_depth: number;
    avg_time_on_page: number;
    days: number;
  }> = {};

  for (const row of contentStats || []) {
    if (!contentAgg[row.content_id]) {
      contentAgg[row.content_id] = {
        content_id: row.content_id,
        views: 0,
        unique_visitors: 0,
        shares: 0,
        bookmarks: 0,
        avg_scroll_depth: 0,
        avg_time_on_page: 0,
        days: 0,
      };
    }
    const agg = contentAgg[row.content_id];
    agg.views += row.views ?? 0;
    agg.unique_visitors += row.unique_visitors ?? 0;
    agg.shares += row.shares ?? 0;
    agg.bookmarks += row.bookmarks ?? 0;
    agg.avg_scroll_depth += row.avg_scroll_depth ?? 0;
    agg.avg_time_on_page += row.avg_time_on_page ?? 0;
    agg.days += 1;
  }

  // Average out scroll depth and time on page
  for (const agg of Object.values(contentAgg)) {
    if (agg.days > 0) {
      agg.avg_scroll_depth = agg.avg_scroll_depth / agg.days;
      agg.avg_time_on_page = agg.avg_time_on_page / agg.days;
    }
  }

  // Get content titles for top content
  const topContentIds = Object.values(contentAgg)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map((c) => c.content_id);

  const { data: contentTitles } = await admin
    .from('content')
    .select('id, title, slug')
    .in('id', topContentIds.length > 0 ? topContentIds : ['00000000-0000-0000-0000-000000000000']);

  const titleMap = new Map((contentTitles || []).map((c) => [c.id, c]));

  const topContent = topContentIds.map((id) => ({
    ...contentAgg[id],
    title: titleMap.get(id)?.title || 'Unknown',
    slug: titleMap.get(id)?.slug || '',
  }));

  // Aggregate site-level totals
  const totals = {
    totalViews: (siteStats || []).reduce((sum, s) => sum + s.total_views, 0),
    uniqueVisitors: (siteStats || []).reduce((sum, s) => sum + s.unique_visitors, 0),
    avgTimeOnPage: topContent.length > 0
      ? topContent.reduce((sum, c) => sum + c.avg_time_on_page, 0) / topContent.length
      : 0,
  };

  // Aggregate referrers across days
  const referrerCounts: Record<string, number> = {};
  for (const day of siteStats || []) {
    const refs = day.top_referrers as Array<{ source: string; count: number }> || [];
    for (const r of refs) {
      referrerCounts[r.source] = (referrerCounts[r.source] || 0) + r.count;
    }
  }
  const topReferrers = Object.entries(referrerCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Aggregate device breakdown
  const deviceTotals: Record<string, number> = {};
  for (const day of siteStats || []) {
    const devices = day.device_breakdown as Record<string, number> || {};
    for (const [device, count] of Object.entries(devices)) {
      deviceTotals[device] = (deviceTotals[device] || 0) + count;
    }
  }

  // Aggregate UTM breakdown
  const utmTotals: Record<string, number> = {};
  for (const day of siteStats || []) {
    const utms = day.utm_breakdown as Record<string, number> || {};
    for (const [utm, count] of Object.entries(utms)) {
      utmTotals[utm] = (utmTotals[utm] || 0) + count;
    }
  }

  // Aggregate search terms
  const searchReferrerCounts: Record<string, { count: number; engine: string; landing_pages: Record<string, number> }> = {};
  const siteSearchCounts: Record<string, { count: number; total_results: number }> = {};

  for (const ev of searchEvents || []) {
    const data = ev.event_data as Record<string, unknown>;
    const query = (data?.query as string || '').toLowerCase().trim();
    if (!query) continue;

    if (ev.event_type === 'search_referrer') {
      if (!searchReferrerCounts[query]) {
        searchReferrerCounts[query] = { count: 0, engine: (data?.engine as string) || 'unknown', landing_pages: {} };
      }
      searchReferrerCounts[query].count++;
      const landingPath = (data?.landing_path as string) || '/';
      searchReferrerCounts[query].landing_pages[landingPath] =
        (searchReferrerCounts[query].landing_pages[landingPath] || 0) + 1;
    } else if (ev.event_type === 'site_search') {
      if (!siteSearchCounts[query]) {
        siteSearchCounts[query] = { count: 0, total_results: 0 };
      }
      siteSearchCounts[query].count++;
      siteSearchCounts[query].total_results += (data?.results_count as number) || 0;
    }
  }

  const searchReferrerTerms = Object.entries(searchReferrerCounts)
    .map(([query, info]) => ({
      query,
      count: info.count,
      engine: info.engine,
      top_landing_page: Object.entries(info.landing_pages)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '/',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const siteSearchTerms = Object.entries(siteSearchCounts)
    .map(([query, info]) => ({
      query,
      count: info.count,
      avg_results: info.count > 0 ? Math.round(info.total_results / info.count) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return NextResponse.json({
    totals,
    dailyStats: siteStats || [],
    topContent,
    topReferrers,
    deviceBreakdown: deviceTotals,
    utmBreakdown: utmTotals,
    searchReferrerTerms,
    siteSearchTerms,
  });
}
