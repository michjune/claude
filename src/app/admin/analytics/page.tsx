'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Eye, Users, Clock, Globe, FlaskConical, Search } from 'lucide-react';

const PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'All time', value: 'all' },
];

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#4f46e5', '#c026d3'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/dashboard?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  const dailyChartData = (data?.dailyStats || []).map((d: { date: string; total_views: number; unique_visitors: number }) => ({
    date: d.date,
    views: d.total_views,
    visitors: d.unique_visitors,
  }));

  const referrerChartData = (data?.topReferrers || []).map((r: { source: string; count: number }) => ({
    name: r.source,
    value: r.count,
  }));

  const deviceChartData = Object.entries(data?.deviceBreakdown || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value as number,
  }));

  const utmData = Object.entries(data?.utmBreakdown || {}).map(([campaign, views]) => ({
    campaign,
    views: views as number,
  })).sort((a, b) => b.views - a.views);

  const searchReferrerTerms = (data?.searchReferrerTerms || []) as Array<{
    query: string;
    count: number;
    engine: string;
    top_landing_page: string;
  }>;

  const siteSearchTerms = (data?.siteSearchTerms || []) as Array<{
    query: string;
    count: number;
    avg_results: number;
  }>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track traffic, engagement, and content performance</p>
        </div>
        <Link
          href="/admin/analytics/ab-test"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
        >
          <FlaskConical className="h-4 w-4" />
          A/B Test Results
        </Link>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              period === p.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border hover:bg-accent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-card border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Views"
              value={data?.totals?.totalViews?.toLocaleString() || '0'}
              icon={<Eye className="h-5 w-5" />}
            />
            <StatCard
              title="Unique Visitors"
              value={data?.totals?.uniqueVisitors?.toLocaleString() || '0'}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              title="Avg Time on Page"
              value={formatDuration(data?.totals?.avgTimeOnPage || 0)}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              title="Top Referrer"
              value={data?.topReferrers?.[0]?.source || 'None'}
              icon={<Globe className="h-5 w-5" />}
            />
          </div>

          {/* Traffic over time */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Traffic Over Time</h2>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Area type="monotone" dataKey="views" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} name="Views" />
                  <Area type="monotone" dataKey="visitors" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.1} name="Unique Visitors" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No traffic data yet for this period" />
            )}
          </div>

          {/* Top Content */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Top Content</h2>
            {(data?.topContent || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Post</th>
                      <th className="text-right py-2 px-2 font-medium">Views</th>
                      <th className="text-right py-2 px-2 font-medium">Visitors</th>
                      <th className="text-right py-2 px-2 font-medium">Shares</th>
                      <th className="text-right py-2 px-2 font-medium">Bookmarks</th>
                      <th className="text-right py-2 px-2 font-medium">Avg Scroll</th>
                      <th className="text-right py-2 pl-2 font-medium">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topContent.map((c: { content_id: string; title: string; slug: string; views: number; unique_visitors: number; shares: number; bookmarks: number; avg_scroll_depth: number; avg_time_on_page: number }) => (
                      <tr key={c.content_id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <Link href={`/posts/${c.slug}`} className="text-primary hover:underline line-clamp-1">
                            {c.title}
                          </Link>
                        </td>
                        <td className="text-right py-2 px-2">{c.views.toLocaleString()}</td>
                        <td className="text-right py-2 px-2">{c.unique_visitors.toLocaleString()}</td>
                        <td className="text-right py-2 px-2">{c.shares}</td>
                        <td className="text-right py-2 px-2">{c.bookmarks}</td>
                        <td className="text-right py-2 px-2">{Math.round(c.avg_scroll_depth)}%</td>
                        <td className="text-right py-2 pl-2">{formatDuration(c.avg_time_on_page)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No content data yet for this period" />
            )}
          </div>

          {/* Search Terms row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Search Engine Terms */}
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Search Engine Terms</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Terms people searched on Bing, DuckDuckGo, Yahoo, etc. that led them to your pages.
                Google encrypts most queries — connect Google Search Console for full Google data.
              </p>
              {searchReferrerTerms.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Search Term</th>
                        <th className="text-right py-2 px-2 font-medium">Clicks</th>
                        <th className="text-left py-2 px-2 font-medium">Engine</th>
                        <th className="text-left py-2 pl-2 font-medium">Landing Page</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchReferrerTerms.map((term) => (
                        <tr key={term.query} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{term.query}</td>
                          <td className="text-right py-2 px-2">{term.count}</td>
                          <td className="py-2 px-2 capitalize text-muted-foreground">{term.engine}</td>
                          <td className="py-2 pl-2">
                            <Link href={term.top_landing_page} className="text-primary hover:underline text-xs">
                              {term.top_landing_page}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="No search engine referral data yet. As visitors arrive from Bing, DuckDuckGo, and other search engines, their search terms will appear here." />
              )}
            </div>

            {/* Site Search Terms */}
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">On-Site Search Terms</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                What visitors are searching for on your site. Low-result queries may indicate content gaps.
              </p>
              {siteSearchTerms.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Search Term</th>
                        <th className="text-right py-2 px-2 font-medium">Searches</th>
                        <th className="text-right py-2 pl-2 font-medium">Avg Results</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siteSearchTerms.map((term) => (
                        <tr key={term.query} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{term.query}</td>
                          <td className="text-right py-2 px-2">{term.count}</td>
                          <td className="text-right py-2 pl-2">
                            <span className={term.avg_results === 0 ? 'text-red-500 font-medium' : ''}>
                              {term.avg_results}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="No site search data yet. When visitors use the search page, their queries will appear here." />
              )}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Traffic Sources */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Traffic Sources</h2>
              {referrerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={referrerChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {referrerChartData.map((_: unknown, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No referrer data yet" />
              )}
            </div>

            {/* Device Breakdown */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Device Breakdown</h2>
              {deviceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={deviceChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} name="Views" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No device data yet" />
              )}
            </div>
          </div>

          {/* UTM Campaign Performance */}
          {utmData.length > 0 && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">UTM Campaign Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Campaign</th>
                      <th className="text-right py-2 font-medium">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utmData.map((u) => (
                      <tr key={u.campaign} className="border-b last:border-0">
                        <td className="py-2 pr-4">{u.campaign}</td>
                        <td className="text-right py-2">{u.views.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm text-center px-4">
      {message}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}
