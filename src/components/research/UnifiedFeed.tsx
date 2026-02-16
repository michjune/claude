'use client';

import { useState, useMemo } from 'react';
import type { Paper, Content } from '@/lib/supabase/types';
import { PaperCard } from './PaperCard';
import { BlogPostCard } from './BlogPostCard';
import { FeedFilters } from './FeedFilters';

type FeedItem =
  | { type: 'paper'; date: string; data: Paper }
  | { type: 'blog'; date: string; data: Content };

interface UnifiedFeedProps {
  papers: Paper[];
  blogPosts: Content[];
}

export function UnifiedFeed({ papers, blogPosts }: UnifiedFeedProps) {
  const [activeSource, setActiveSource] = useState('all');
  const [activeSort, setActiveSort] = useState('date');

  const allItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [
      ...papers.map((p) => ({
        type: 'paper' as const,
        date: p.published_date || p.fetched_at,
        data: p,
      })),
      ...blogPosts.map((bp) => ({
        type: 'blog' as const,
        date: bp.published_at || bp.created_at,
        data: bp,
      })),
    ];
    return items;
  }, [papers, blogPosts]);

  const filtered = useMemo(() => {
    let items = allItems;

    if (activeSource === 'paper') {
      items = items.filter(
        (i) => i.type === 'paper' && (i.data as Paper).source_type !== 'trial' && (i.data as Paper).source_type !== 'news'
      );
    } else if (activeSource === 'blog') {
      items = items.filter((i) => i.type === 'blog');
    } else if (activeSource === 'trial') {
      items = items.filter(
        (i) => i.type === 'paper' && (i.data as Paper).source_type === 'trial'
      );
    } else if (activeSource === 'news') {
      items = items.filter(
        (i) => i.type === 'paper' && (i.data as Paper).source_type === 'news'
      );
    }

    if (activeSort === 'date') {
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (activeSort === 'venue') {
      items.sort((a, b) => {
        const aVenue = a.type === 'paper' ? (a.data as Paper).journal_name || '' : 'Blog';
        const bVenue = b.type === 'paper' ? (b.data as Paper).journal_name || '' : 'Blog';
        return aVenue.localeCompare(bVenue);
      });
    }

    return items;
  }, [allItems, activeSource, activeSort]);

  return (
    <div>
      <FeedFilters
        activeSource={activeSource}
        activeSort={activeSort}
        onFilterSource={setActiveSource}
        onSort={setActiveSort}
        itemCount={filtered.length}
      />
      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) =>
            item.type === 'paper' ? (
              <PaperCard key={`paper-${item.data.id}`} paper={item.data as Paper} />
            ) : (
              <BlogPostCard key={`blog-${item.data.id}`} post={item.data as Content} />
            )
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No items match your filters.</p>
        </div>
      )}
    </div>
  );
}
