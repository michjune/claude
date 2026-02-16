import Link from 'next/link';
import { notFound } from 'next/navigation';
import { feedItems } from '@/data/items';
import { EvidenceBadge } from '@/components/feed-a/EvidenceBadge';
import { SourceLinks } from '@/components/feed-a/SourceLinks';
import { TagPills } from '@/components/feed-a/TagPills';

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
      {/* Minimal header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center">
          <Link
            href="/a"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Feed
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[12px] font-medium tracking-wide uppercase text-muted-foreground/70">
            {item.venue}
          </span>
          <span className="text-muted-foreground/30">·</span>
          <time className="text-[12px] font-mono text-muted-foreground/60 tabular-nums" dateTime={item.date}>
            {formatDate(item.date)}
          </time>
          <EvidenceBadge level={item.evidenceLevel} />
        </div>

        {/* Title */}
        <h1 className="font-serif text-[2rem] leading-[1.2] tracking-tight text-foreground">
          {item.title}
        </h1>

        {/* Authors */}
        <p className="mt-3 text-[14px] text-muted-foreground/70">
          {item.authors.join(', ')}
        </p>

        {/* Divider */}
        <div className="my-8 h-px bg-border-subtle" />

        {/* Key Finding */}
        <section>
          <h2 className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">
            Key Finding
          </h2>
          <p className="text-[16px] leading-[1.7] text-foreground">
            {item.keyFinding}
          </p>
        </section>

        {/* Tags */}
        <div className="mt-8">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">
            Topics
          </h2>
          <TagPills tags={item.tags} />
        </div>

        {/* Sources */}
        <div className="mt-8 pt-6 border-t border-border-subtle">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">
            Sources
          </h2>
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
