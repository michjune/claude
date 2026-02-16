'use client';

import { useState, useMemo } from 'react';
import { feedItems } from '@/data/items';
import { TopNav } from '@/components/feed-b/TopNav';
import { BentoGrid } from '@/components/feed-b/BentoGrid';
import { FilterBar } from '@/components/feed-b/FilterBar';
import { ArticleCard } from '@/components/feed-b/ArticleCard';

export default function FeedBPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sort, setSort] = useState('date');

  const filtered = useMemo(() => {
    let items = [...feedItems];

    if (sourceFilter !== 'all') {
      items = items.filter((item) => item.sourceType === sourceFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.keyFinding.toLowerCase().includes(q) ||
          item.venue.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.authors.some((a) => a.toLowerCase().includes(q))
      );
    }

    if (sort === 'venue') {
      items.sort((a, b) => a.venue.localeCompare(b.venue));
    }

    return items;
  }, [searchQuery, sourceFilter, sort]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav onSearch={setSearchQuery} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        {/* Hero */}
        <section className="pt-12 pb-10">
          <div className="flex items-start justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-medium text-primary">Live Research Feed</span>
              </div>
              <h1 className="text-[2.75rem] sm:text-[3.25rem] font-semibold tracking-tight leading-[1.08] text-foreground max-w-xl">
                Stem cell intelligence, updated daily
              </h1>
              <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground max-w-md">
                Papers, trials, and regulatory events from 40+ journals. AI-summarized, citation-linked, always current.
              </p>
            </div>
          </div>
        </section>

        {/* Bento overview */}
        <BentoGrid />

        {/* Feed section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-semibold text-foreground">
              Research Feed
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground/40 tabular-nums">
              {filtered.length} items
            </span>
          </div>

          <FilterBar
            activeSource={sourceFilter}
            activeSort={sort}
            onFilterSource={setSourceFilter}
            onSort={setSort}
          />

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[14px] text-muted-foreground">
                No results match your filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 mt-1">
              {filtered.map((item) => (
                <ArticleCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-border-subtle flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/40 font-mono">
            StemCell Pulse
          </p>
          <p className="text-[11px] text-muted-foreground/40 font-mono">
            Sources verified daily
          </p>
        </footer>
      </main>
    </div>
  );
}
