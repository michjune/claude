import Link from 'next/link';
import { notFound } from 'next/navigation';
import { feedItems } from '@/data/items';
import { EvidenceBadge } from '@/components/feed-c/EvidenceBadge';
import { SourcePills } from '@/components/feed-c/SourcePills';

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
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/c"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md px-1"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Feed
          </Link>
          <EvidenceBadge level={item.evidenceLevel} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Venue + Date */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[12px] font-semibold tracking-wide text-primary/80">
            {item.venue}
          </span>
          <span className="text-muted-foreground/20 text-[10px]">·</span>
          <time className="text-[12px] font-mono text-muted-foreground/45 tabular-nums" dateTime={item.date}>
            {formatDate(item.date)}
          </time>
        </div>

        {/* Title — editorial serif */}
        <h1 className="font-serif text-[1.875rem] sm:text-[2.125rem] leading-[1.2] tracking-tight text-foreground">
          {item.title}
        </h1>

        {/* Authors */}
        <p className="mt-3 text-[14px] text-muted-foreground/55">
          {item.authors.join(', ')}
        </p>

        {/* Key Finding — elevated */}
        <div className="mt-8 rounded-lg border border-border-subtle bg-surface/50 p-6">
          <p className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-muted-foreground/40 mb-2">
            Key Finding
          </p>
          <p className="text-[16px] leading-[1.7] text-foreground">
            {item.keyFinding}
          </p>
        </div>

        {/* Tags */}
        <div className="mt-6">
          <p className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-muted-foreground/40 mb-2.5">
            Topics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-border-subtle px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/60"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Sources */}
        <div className="mt-6 pt-6 border-t border-border-subtle">
          <p className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-muted-foreground/40 mb-2.5">
            Sources
          </p>
          <SourcePills
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
