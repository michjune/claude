'use client';

import { useState, useMemo } from 'react';
import { feedItems } from '@/data/items';
import { TopNav } from '@/components/feed-c/TopNav';
import { SearchBar } from '@/components/feed-c/SearchBar';
import { BentoGrid } from '@/components/feed-c/BentoGrid';
import { FilterChips } from '@/components/feed-c/FilterChips';
import { ArticleCard } from '@/components/feed-c/ArticleCard';

export default function FeedCPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const filtered = useMemo(() => {
    let items = feedItems;

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

    return items;
  }, [searchQuery, sourceFilter]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pb-20">
        {/* Hero */}
        <section className="pt-12 pb-8">
          <p className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-muted-foreground/50 mb-3">
            Research Intelligence
          </p>
          <h1 className="font-serif text-[2.25rem] sm:text-[2.75rem] leading-[1.12] tracking-tight text-foreground max-w-xl">
            The pulse of stem cell science
          </h1>
          <p className="mt-3 text-[15px] leading-[1.65] text-muted-foreground max-w-lg">
            Peer-reviewed papers, clinical trials, and regulatory events from 40+ journals. AI-summarized. Citation-linked. Updated daily.
          </p>

          {/* Search */}
          <div className="mt-6 max-w-xl">
            <SearchBar onSearch={setSearchQuery} />
          </div>
        </section>

        {/* Bento */}
        <section className="pb-8">
          <BentoGrid />
        </section>

        {/* Feed */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h2 className="text-[15px] font-semibold text-foreground">Feed</h2>
              <FilterChips activeSource={sourceFilter} onFilterSource={setSourceFilter} />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground/30 tabular-nums">
              {filtered.length} items
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[14px] text-muted-foreground">No results match your filters.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((item) => (
                <ArticleCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-border-subtle flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/30 font-mono">
            StemCell Pulse
          </p>
          <p className="text-[11px] text-muted-foreground/30 font-mono">
            Sources verified daily
          </p>
        </footer>
      </main>
    </div>
  );
}
