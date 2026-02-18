import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 300;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Process yesterday's data by default
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z`;

  try {
    // ============================================================
    // Aggregate page_views into daily_content_stats
    // ============================================================
    const { data: pageViews } = await admin
      .from('page_views')
      .select('*')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    // Group by content_id
    const contentViews: Record<string, { views: number; sessions: Set<string> }> = {};
    const allSessions = new Set<string>();
    const referrerCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};
    const utmCounts: Record<string, number> = {};

    for (const pv of pageViews || []) {
      if (pv.session_id) allSessions.add(pv.session_id);

      // Content-level stats
      if (pv.content_id) {
        if (!contentViews[pv.content_id]) {
          contentViews[pv.content_id] = { views: 0, sessions: new Set() };
        }
        contentViews[pv.content_id].views++;
        if (pv.session_id) contentViews[pv.content_id].sessions.add(pv.session_id);
      }

      // Referrer aggregation
      let ref = 'Direct';
      if (pv.referrer) {
        try {
          ref = new URL(pv.referrer).hostname;
        } catch {
          ref = 'Other';
        }
      }
      referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;

      // Device aggregation
      if (pv.device_type) {
        deviceCounts[pv.device_type] = (deviceCounts[pv.device_type] || 0) + 1;
      }

      // UTM aggregation
      if (pv.utm_source) {
        const utmKey = [pv.utm_source, pv.utm_medium, pv.utm_campaign].filter(Boolean).join(' / ');
        utmCounts[utmKey] = (utmCounts[utmKey] || 0) + 1;
      }
    }

    // ============================================================
    // Aggregate analytics_events
    // ============================================================
    const { data: events } = await admin
      .from('analytics_events')
      .select('*')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    const contentEvents: Record<string, {
      shares: number;
      bookmarks: number;
      scrollDepths: number[];
      timeOnPage: number[];
    }> = {};

    for (const ev of events || []) {
      if (!ev.content_id) continue;
      if (!contentEvents[ev.content_id]) {
        contentEvents[ev.content_id] = { shares: 0, bookmarks: 0, scrollDepths: [], timeOnPage: [] };
      }
      const ce = contentEvents[ev.content_id];

      if (ev.event_type === 'share') ce.shares++;
      if (ev.event_type === 'bookmark') ce.bookmarks++;
      if (ev.event_type.startsWith('scroll_')) {
        const depth = parseInt(ev.event_type.split('_')[1]);
        if (!isNaN(depth)) ce.scrollDepths.push(depth);
      }
      if (ev.event_type === 'time_on_page') {
        const seconds = (ev.event_data as Record<string, unknown>)?.seconds;
        if (typeof seconds === 'number') ce.timeOnPage.push(seconds);
      }
    }

    // ============================================================
    // Upsert daily_content_stats
    // ============================================================
    const allContentIds = new Set([...Object.keys(contentViews), ...Object.keys(contentEvents)]);

    for (const contentId of allContentIds) {
      const cv = contentViews[contentId] || { views: 0, sessions: new Set() };
      const ce = contentEvents[contentId] || { shares: 0, bookmarks: 0, scrollDepths: [], timeOnPage: [] };

      const avgScrollDepth = ce.scrollDepths.length > 0
        ? ce.scrollDepths.reduce((a, b) => a + b, 0) / ce.scrollDepths.length
        : 0;

      const avgTimeOnPage = ce.timeOnPage.length > 0
        ? ce.timeOnPage.reduce((a, b) => a + b, 0) / ce.timeOnPage.length
        : 0;

      await admin.from('daily_content_stats').upsert(
        {
          content_id: contentId,
          date: dateStr,
          views: cv.views,
          unique_visitors: cv.sessions.size,
          shares: ce.shares,
          bookmarks: ce.bookmarks,
          avg_scroll_depth: Math.round(avgScrollDepth * 100) / 100,
          avg_time_on_page: Math.round(avgTimeOnPage * 100) / 100,
        },
        { onConflict: 'content_id,date' }
      );
    }

    // ============================================================
    // Upsert daily_site_stats
    // ============================================================
    const topReferrers = Object.entries(referrerCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    await admin.from('daily_site_stats').upsert(
      {
        date: dateStr,
        total_views: (pageViews || []).length,
        unique_visitors: allSessions.size,
        top_referrers: topReferrers,
        device_breakdown: deviceCounts,
        utm_breakdown: utmCounts,
      },
      { onConflict: 'date' }
    );

    // Update cron job status
    await admin.from('cron_jobs').upsert(
      {
        job_name: 'aggregate_analytics',
        last_run_at: new Date().toISOString(),
        last_status: 'success',
        last_error: null,
        items_processed: (pageViews || []).length + (events || []).length,
      },
      { onConflict: 'job_name' }
    );

    return NextResponse.json({
      success: true,
      date: dateStr,
      pageViewsProcessed: (pageViews || []).length,
      eventsProcessed: (events || []).length,
      contentStatsWritten: allContentIds.size,
    });
  } catch (error) {
    // Log error to cron_jobs
    await admin.from('cron_jobs').upsert(
      {
        job_name: 'aggregate_analytics',
        last_run_at: new Date().toISOString(),
        last_status: 'failed',
        last_error: error instanceof Error ? error.message : 'Unknown error',
        items_processed: 0,
      },
      { onConflict: 'job_name' }
    );

    return NextResponse.json(
      { error: 'Aggregation failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
