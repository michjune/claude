import Link from 'next/link';
import type { FeedItem as FeedItemType } from '@/data/items';
import { EvidenceBadge } from './EvidenceBadge';
import { SourceLinks } from './SourceLinks';
import { TagPills } from './TagPills';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateAuthors(authors: string[], max = 3) {
  if (authors.length <= max) return authors.join(', ');
  return `${authors.slice(0, max).join(', ')} et al.`;
}

export function FeedItemRow({ item }: { item: FeedItemType }) {
  return (
    <article className="group py-5 border-b border-border-subtle last:border-0">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Top meta line */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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
          <Link
            href={`/a/item/${item.id}`}
            className="block"
          >
            <h3 className="font-serif text-[1.15rem] leading-[1.35] font-normal text-foreground group-hover:text-primary transition-colors duration-150">
              {item.title}
            </h3>
          </Link>

          {/* Authors */}
          <p className="mt-1 text-[13px] text-muted-foreground/70">
            {truncateAuthors(item.authors)}
          </p>

          {/* Key finding */}
          <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground line-clamp-2">
            {item.keyFinding}
          </p>

          {/* Bottom row: tags + source links */}
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <TagPills tags={item.tags.slice(0, 4)} />
            <SourceLinks
              doi={item.doi}
              pubmedId={item.pubmedId}
              trialId={item.trialId}
              url={item.url}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
