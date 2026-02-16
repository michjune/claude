'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ArrowLeft, FlaskConical } from 'lucide-react';

interface PresetStats {
  contentCount: number;
  totalViews: number;
  totalUniqueVisitors: number;
  totalShares: number;
  totalBookmarks: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
  shareRate: number;
  bookmarkRate: number;
  engagementRate: number;
}

interface ContentItem {
  content_id: string;
  title: string;
  slug: string;
  preset: string;
  views: number;
  shares: number;
  bookmarks: number;
  avgScrollDepth: number;
  avgTimeOnPage: number;
}

export default function ABTestPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ab-test-results'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/ab-test');
      if (!res.ok) throw new Error('Failed to fetch A/B test data');
      return res.json();
    },
  });

  const preset1: PresetStats = data?.preset_1 || {} as PresetStats;
  const preset2: PresetStats = data?.preset_2 || {} as PresetStats;
  const significance = data?.significance || { level: 'insufficient', pValue: 1, zScore: 0 };
  const contentBreakdown: ContentItem[] = data?.contentBreakdown || [];

  const comparisonData = [
    {
      metric: 'Views',
      'Custom Tone 1': preset1.totalViews || 0,
      'Custom Tone 2': preset2.totalViews || 0,
    },
    {
      metric: 'Engagement %',
      'Custom Tone 1': Math.round((preset1.engagementRate || 0) * 10000) / 100,
      'Custom Tone 2': Math.round((preset2.engagementRate || 0) * 10000) / 100,
    },
    {
      metric: 'Avg Scroll %',
      'Custom Tone 1': Math.round(preset1.avgScrollDepth || 0),
      'Custom Tone 2': Math.round(preset2.avgScrollDepth || 0),
    },
    {
      metric: 'Avg Time (s)',
      'Custom Tone 1': Math.round(preset1.avgTimeOnPage || 0),
      'Custom Tone 2': Math.round(preset2.avgTimeOnPage || 0),
    },
    {
      metric: 'Share %',
      'Custom Tone 1': Math.round((preset1.shareRate || 0) * 10000) / 100,
      'Custom Tone 2': Math.round((preset2.shareRate || 0) * 10000) / 100,
    },
    {
      metric: 'Bookmark %',
      'Custom Tone 1': Math.round((preset1.bookmarkRate || 0) * 10000) / 100,
      'Custom Tone 2': Math.round((preset2.bookmarkRate || 0) * 10000) / 100,
    },
  ];

  const colorMap: Record<string, string> = {
    significant: 'bg-green-100 text-green-800 border-green-200',
    trending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    insufficient: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const significanceColor = colorMap[significance.level as string] || 'bg-gray-100 text-gray-600 border-gray-200';

  const labelMap: Record<string, string> = {
    significant: 'Statistically Significant (p < 0.05)',
    trending: 'Trending (p < 0.10)',
    insufficient: 'Insufficient Data',
  };
  const significanceLabel = labelMap[significance.level as string] || 'Insufficient Data';

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analytics
        </Link>
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">A/B Test Results</h1>
            <p className="text-muted-foreground mt-1">Compare Custom Tone 1 vs Custom Tone 2 performance</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-card border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Significance indicator */}
          <div className={`rounded-lg border p-4 ${significanceColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{significanceLabel}</p>
                <p className="text-sm mt-1">
                  Z-score: {significance.zScore.toFixed(3)} | p-value: {significance.pValue.toFixed(4)}
                </p>
              </div>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid gap-6 md:grid-cols-2">
            <PresetCard label="Custom Tone 1" preset="preset_1" stats={preset1} />
            <PresetCard label="Custom Tone 2" preset="preset_2" stats={preset2} />
          </div>

          {/* Bar chart comparison */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Metric Comparison</h2>
            {(preset1.totalViews > 0 || preset2.totalViews > 0) ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="metric" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Custom Tone 1" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Custom Tone 2" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No A/B test data available yet. Content needs to be published with ab_preset metadata.
              </div>
            )}
          </div>

          {/* Content breakdown */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Content Breakdown</h2>
            {contentBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Post</th>
                      <th className="text-left py-2 px-2 font-medium">Preset</th>
                      <th className="text-right py-2 px-2 font-medium">Views</th>
                      <th className="text-right py-2 px-2 font-medium">Shares</th>
                      <th className="text-right py-2 px-2 font-medium">Bookmarks</th>
                      <th className="text-right py-2 px-2 font-medium">Avg Scroll</th>
                      <th className="text-right py-2 pl-2 font-medium">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentBreakdown.map((c) => (
                      <tr key={c.content_id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <Link href={`/posts/${c.slug}`} className="text-primary hover:underline line-clamp-1">
                            {c.title}
                          </Link>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.preset === 'preset_1'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {c.preset === 'preset_1' ? 'Tone 1' : 'Tone 2'}
                          </span>
                        </td>
                        <td className="text-right py-2 px-2">{c.views.toLocaleString()}</td>
                        <td className="text-right py-2 px-2">{c.shares}</td>
                        <td className="text-right py-2 px-2">{c.bookmarks}</td>
                        <td className="text-right py-2 px-2">{Math.round(c.avgScrollDepth)}%</td>
                        <td className="text-right py-2 pl-2">{formatDuration(c.avgTimeOnPage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No content with A/B preset metadata found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PresetCard({ label, preset, stats }: { label: string; preset: string; stats: PresetStats }) {
  const color = preset === 'preset_1' ? 'border-blue-200' : 'border-purple-200';
  return (
    <div className={`rounded-lg border-2 bg-card p-6 ${color}`}>
      <h3 className="text-lg font-semibold mb-4">{label}</h3>
      <div className="space-y-3 text-sm">
        <MetricRow label="Posts" value={String(stats.contentCount || 0)} />
        <MetricRow label="Total Views" value={(stats.totalViews || 0).toLocaleString()} />
        <MetricRow label="Unique Visitors" value={(stats.totalUniqueVisitors || 0).toLocaleString()} />
        <MetricRow label="Engagement Rate" value={`${((stats.engagementRate || 0) * 100).toFixed(2)}%`} />
        <MetricRow label="Avg Scroll Depth" value={`${Math.round(stats.avgScrollDepth || 0)}%`} />
        <MetricRow label="Avg Time on Page" value={formatDuration(stats.avgTimeOnPage || 0)} />
        <MetricRow label="Share Rate" value={`${((stats.shareRate || 0) * 100).toFixed(2)}%`} />
        <MetricRow label="Bookmark Rate" value={`${((stats.bookmarkRate || 0) * 100).toFixed(2)}%`} />
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}
