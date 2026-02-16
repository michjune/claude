import Link from 'next/link';
import { notFound } from 'next/navigation';
import { feedItems } from '@/data/items';
import { EvidenceBadge } from '@/components/feed-b/EvidenceBadge';
import { SourceLinks } from '@/components/feed-b/SourceLinks';
import { TagPills } from '@/components/feed-b/TagPills';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function generateStaticParams() {
  return feedItems.map((item) => ({ id: item.id }));
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = feedItems.find((i) => i.id === id);
  if (!item) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border-subtle">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/b"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to Feed
          </Link>
          <EvidenceBadge level={item.evidenceLevel} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Venue + Date */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-primary/80">
            {item.venue}
          </span>
          <span className="text-[10px] text-muted-foreground/30">|</span>
          <time className="text-[12px] font-mono text-muted-foreground/50 tabular-nums" dateTime={item.date}>
            {formatDate(item.date)}
          </time>
        </div>

        {/* Title */}
        <h1 className="text-[1.75rem] font-semibold leading-[1.25] tracking-tight text-foreground">
          {item.title}
        </h1>

        {/* Authors */}
        <p className="mt-3 text-[14px] text-muted-foreground/60">
          {item.authors.join(', ')}
        </p>

        {/* Key Finding */}
        <div className="mt-8 rounded-lg border border-border-subtle bg-surface/50 p-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/50 mb-2">
            Key Finding
          </p>
          <p className="text-[15px] leading-[1.7] text-foreground">
            {item.keyFinding}
          </p>
        </div>

        {/* Tags */}
        <div className="mt-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/50 mb-2">
            Topics
          </p>
          <TagPills tags={item.tags} />
        </div>

        {/* Sources */}
        <div className="mt-6 pt-5 border-t border-border-subtle">
          <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/50 mb-2">
            Sources
          </p>
          <SourceLinks
            doi={item.doi}
            pubmedId={item.pubmedId}
            trialId={item.trialId}
            url={item.url}
          />
        </div>
      </main>
    </div>
  );
}
