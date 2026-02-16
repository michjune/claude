import Link from 'next/link';
import type { FeedItem } from '@/data/items';
import { EvidenceBadge } from './EvidenceBadge';
import { SourcePills } from './SourcePills';

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
    <article className="group rounded-lg border border-border-subtle bg-card p-5 transition-all duration-200 hover:shadow-elevated hover:border-border focus-within:ring-2 focus-within:ring-primary/20">
      {/* Meta row */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="text-[11.5px] font-semibold tracking-wide text-primary/80">
          {item.venue}
        </span>
        <span className="text-muted-foreground/20 text-[10px]">·</span>
        <time className="text-[11px] font-mono text-muted-foreground/45 tabular-nums" dateTime={item.date}>
          {formatDate(item.date)}
        </time>
        <EvidenceBadge level={item.evidenceLevel} />
      </div>

      {/* Title — serif, editorial */}
      <Link href={`/c/item/${item.id}`} className="block focus-visible:outline-none">
        <h3 className="font-serif text-[1.05rem] leading-[1.4] text-foreground group-hover:text-primary transition-colors duration-150 line-clamp-2">
          {item.title}
        </h3>
      </Link>

      {/* Authors */}
      <p className="mt-1 text-[12px] text-muted-foreground/50">
        {truncateAuthors(item.authors)}
      </p>

      {/* Key finding — the dek */}
      <p className="mt-2 text-[13px] leading-[1.6] text-muted-foreground line-clamp-2">
        {item.keyFinding}
      </p>

      {/* Tags + sources */}
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 hover:border-primary/20 hover:text-primary/70 transition-colors cursor-default"
            >
              {tag}
            </span>
          ))}
        </div>
        <SourcePills
          doi={item.doi}
          pubmedId={item.pubmedId}
          trialId={item.trialId}
          url={item.url}
        />
      </div>
    </article>
  );
}
