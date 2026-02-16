import Link from 'next/link';
import type { FeedItem } from '@/data/items';
import { EvidenceBadge } from './EvidenceBadge';
import { SourceLinks } from './SourceLinks';
import { TagPills } from './TagPills';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function truncateAuthors(authors: string[], max = 3) {
  if (authors.length <= max) return authors.join(', ');
  return `${authors.slice(0, max).join(', ')} et al.`;
}

export function ArticleCard({ item }: { item: FeedItem }) {
  return (
    <article className="group rounded-lg border border-border-subtle bg-card p-4 transition-all duration-200 hover:shadow-elevated hover:border-border">
      {/* Top row: venue + date + evidence */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
          {item.venue}
        </span>
        <span className="text-[10px] text-muted-foreground/30">|</span>
        <time className="text-[11px] font-mono text-muted-foreground/50 tabular-nums" dateTime={item.date}>
          {formatDate(item.date)}
        </time>
        <EvidenceBadge level={item.evidenceLevel} />
      </div>

      {/* Title */}
      <Link href={`/b/item/${item.id}`} className="block">
        <h3 className="text-[15px] font-semibold leading-[1.35] text-foreground group-hover:text-primary transition-colors duration-150 line-clamp-2">
          {item.title}
        </h3>
      </Link>

      {/* Authors */}
      <p className="mt-1 text-[12px] text-muted-foreground/60">
        {truncateAuthors(item.authors)}
      </p>

      {/* Key finding */}
      <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground line-clamp-2">
        {item.keyFinding}
      </p>

      {/* Bottom row */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <TagPills tags={item.tags.slice(0, 3)} />
        <SourceLinks
          doi={item.doi}
          pubmedId={item.pubmedId}
          trialId={item.trialId}
          url={item.url}
        />
      </div>
    </article>
  );
}
