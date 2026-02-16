'use client';

import { useState, useMemo } from 'react';
import { feedItems } from '@/data/items';
import { TopNav } from '@/components/feed-a/TopNav';
import { SummaryStrip } from '@/components/feed-a/SummaryStrip';
import { FeedItemRow } from '@/components/feed-a/FeedItem';

export default function FeedAPage() {
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
      <TopNav
        onSearch={setSearchQuery}
        onFilterSource={setSourceFilter}
        activeSource={sourceFilter}
      />

      <main className="mx-auto max-w-3xl px-4 pb-20">
        {/* Hero */}
        <section className="pt-16 pb-12 border-b border-border">
          <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-muted-foreground/60 mb-4">
            Stem Cell Research Intelligence
          </p>
          <h1 className="font-serif text-display tracking-tight text-foreground max-w-2xl">
            The research feed for stem cell science
          </h1>
          <p className="mt-4 text-[17px] leading-[1.6] text-muted-foreground max-w-xl font-serif italic">
            Peer-reviewed papers, clinical trials, and regulatory events. Verified daily, summarized by AI, linked to primary sources.
          </p>
        </section>

        <div className="pt-6">
          <SummaryStrip />
        </div>

        <div className="mt-2">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-[14px]">
                No items match your filters.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <FeedItemRow key={item.id} item={item} />
            ))
          )}
        </div>

        {/* Institutional footer */}
        <footer className="mt-16 pt-6 border-t border-border-subtle text-center">
          <p className="text-[11px] font-mono text-muted-foreground/50 tracking-wide">
            StemCell Pulse · Automated research intelligence · Sources verified daily
          </p>
        </footer>
      </main>
    </div>
  );
}
