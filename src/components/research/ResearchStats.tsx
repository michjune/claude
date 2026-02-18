'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Stats {
  papersWeek: number;
  trialsWeek: number;
  regulatoryWeek: number;
  totalPapers: number;
  totalPublished: number;
  trending: Array<{ id: string; title: string; journal_name: string | null; citation_count: number }>;
  topics: Array<{ label: string; count: number }>;
  updatedAt: string;
}

function BentoCard({
  label,
  value,
  subtitle,
  loading,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4 transition-shadow hover:shadow-subtle">
      <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/60 mb-2">
        {label}
      </p>
      <p className={`text-2xl font-semibold tabular-nums text-foreground leading-none transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

const REFRESH_INTERVAL = 30_000; // 30 seconds

export function ResearchStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/research/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silently retry next interval
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const lastUpdated = stats?.updatedAt
    ? new Date(stats.updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BentoCard
          label="New Papers"
          value={stats?.papersWeek ?? '—'}
          subtitle="Past 7 days"
          loading={loading}
        />
        <BentoCard
          label="Trials Updated"
          value={stats?.trialsWeek ?? '—'}
          subtitle="Past 7 days"
          loading={loading}
        />
        <BentoCard
          label="Regulatory"
          value={stats?.regulatoryWeek ?? '—'}
          subtitle="Past 7 days"
          loading={loading}
        />
        <BentoCard
          label="Total in Database"
          value={stats ? `${stats.totalPapers} papers · ${stats.totalPublished} posts` : '—'}
          subtitle="All time"
          loading={loading}
        />

        {/* Trending */}
        <div className="col-span-2 rounded-lg border border-border-subtle bg-card p-4 transition-shadow hover:shadow-subtle">
          <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
            Most Cited
          </p>
          <div className="space-y-2.5">
            {(stats?.trending || []).map((item, i) => (
              <Link key={item.id} href={`/research/${item.id}`} className="flex gap-2.5 group">
                <span className="text-[13px] font-mono text-muted-foreground/30 tabular-nums leading-tight mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-muted-foreground/60">{item.journal_name}</p>
                    {item.citation_count > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground/40 tabular-nums">
                        {item.citation_count} citations
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {loading && !stats && (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded bg-muted/30 animate-pulse" />
                ))}
              </div>
            )}
            {!loading && (!stats?.trending || stats.trending.length === 0) && (
              <p className="text-[13px] text-muted-foreground/50">No papers yet</p>
            )}
          </div>
        </div>

        {/* Topics */}
        <div className="col-span-2 rounded-lg border border-border-subtle bg-card p-4 transition-shadow hover:shadow-subtle">
          <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
            Research Areas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(stats?.topics || []).map(({ label, count }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary cursor-pointer"
              >
                {label}
                <span className="text-[9px] text-muted-foreground/40 tabular-nums">{count}</span>
              </span>
            ))}
            {loading && !stats && (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-7 w-16 rounded-full bg-muted/30 animate-pulse" />
                ))}
              </div>
            )}
            {!loading && (!stats?.topics || stats.topics.length === 0) && (
              <p className="text-[13px] text-muted-foreground/50">No topics yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Last updated indicator */}
      {lastUpdated && (
        <div className="mt-2 flex items-center gap-1.5 justify-end">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/40">
            Live · updated {lastUpdated}
          </span>
        </div>
      )}
    </div>
  );
}
