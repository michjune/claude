import Link from 'next/link';
import type { FeedItem } from '@/data/items';
import { EvidenceBadge } from './EvidenceBadge';
import { SourcePills } from './SourcePills';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateAuthors(authors: string[], max = 2) {
  if (authors.length <= max) return authors.join(', ');
  return `${authors.slice(0, max).join(', ')} et al.`;
}

export function ArticleCard({ item }: { item: FeedItem }) {
  return (
    <article className="group rounded-2xl border border-gray-200/60 bg-white p-5 transition-all duration-300 hover:border-gray-300/80 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      {/* Meta */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="text-[11px] font-semibold tracking-wide text-teal-600">
          {item.venue}
        </span>
        <span className="text-gray-300 text-[10px]">·</span>
        <time className="text-[10px] font-mono text-gray-400 tabular-nums" dateTime={item.date}>
          {formatDate(item.date)}
        </time>
        <EvidenceBadge level={item.evidenceLevel} />
      </div>

      {/* Title */}
      <Link href={`/e/item/${item.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20 rounded-sm">
        <h3 className="text-[15px] font-semibold leading-[1.4] text-gray-900 group-hover:text-teal-700 transition-colors duration-200 line-clamp-2">
          {item.title}
        </h3>
      </Link>

      {/* Authors */}
      <p className="mt-1.5 text-[11px] text-gray-400">
        {truncateAuthors(item.authors)}
      </p>

      {/* Key finding */}
      <p className="mt-2.5 text-[13px] leading-[1.6] text-gray-500 line-clamp-2">
        {item.keyFinding}
      </p>

      {/* Tags + sources */}
      <div className="mt-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-gray-200/80 px-2 py-0.5 text-[9.5px] font-medium text-gray-400 hover:text-teal-600 hover:border-teal-200 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
        <SourcePills doi={item.doi} pubmedId={item.pubmedId} trialId={item.trialId} url={item.url} />
      </div>
    </article>
  );
}
