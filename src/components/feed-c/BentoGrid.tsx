import Link from 'next/link';
import { feedItems } from '@/data/items';

function countRecent(days: number, filter?: (item: typeof feedItems[0]) => boolean) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return feedItems.filter(
    (item) => new Date(item.date) >= cutoff && (filter ? filter(item) : true)
  ).length;
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4 transition-all duration-200 hover:shadow-subtle hover:border-border">
      <p className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-muted-foreground/50 mb-1.5">
        {label}
      </p>
      <p className="text-[1.75rem] font-semibold tabular-nums leading-none text-foreground tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground/50">{detail}</p>
    </div>
  );
}

function TrendingCard() {
  const trending = feedItems
    .filter((i) => i.evidenceLevel === 'peer-reviewed' || i.evidenceLevel === 'meta-analysis')
    .slice(0, 4);

  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4 transition-all duration-200 hover:shadow-subtle hover:border-border col-span-2 sm:col-span-1">
      <p className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-muted-foreground/50 mb-3">
        Trending this week
      </p>
      <div className="space-y-3">
        {trending.map((item, i) => (
          <Link
            key={item.id}
            href={`/c/item/${item.id}`}
            className="flex gap-2.5 group"
          >
            <span className="text-[12px] font-mono text-muted-foreground/25 tabular-nums mt-0.5 shrink-0 w-4">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {item.title}
              </p>
              <p className="text-[11px] text-muted-foreground/40 mt-0.5">{item.venue}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TopicsCard() {
  const allTags = feedItems.flatMap((i) => i.tags);
  const counts = allTags.reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4 transition-all duration-200 hover:shadow-subtle hover:border-border col-span-2 sm:col-span-1">
      <p className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-muted-foreground/50 mb-3">
        Topics
      </p>
      <div className="flex flex-wrap gap-1.5">
        {top.map(([tag, count]) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-border-subtle px-2 py-0.5 text-[11px] text-muted-foreground/70 hover:border-primary/30 hover:text-primary transition-colors cursor-pointer"
          >
            {tag}
            <span className="text-[9px] text-muted-foreground/30 tabular-nums">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function BentoGrid() {
  const papers = countRecent(7, (i) => i.sourceType === 'journal');
  const trials = countRecent(7, (i) => i.sourceType === 'trial');
  const regulatory = countRecent(7, (i) => i.sourceType === 'news');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Papers" value={papers} detail="past 7 days" />
      <StatCard label="Trials" value={trials} detail="past 7 days" />
      <StatCard label="Regulatory" value={regulatory} detail="past 7 days" />
      <StatCard label="Database" value={feedItems.length} detail="total items" />
      <TrendingCard />
      <TopicsCard />
    </div>
  );
}
