import { feedItems } from '@/data/items';

function countRecent(days: number, filter?: (item: typeof feedItems[0]) => boolean) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return feedItems.filter(
    (item) => new Date(item.date) >= cutoff && (filter ? filter(item) : true)
  ).length;
}

function BentoCard({
  label,
  value,
  subtitle,
  className = '',
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border-subtle bg-card p-4 transition-shadow hover:shadow-subtle ${className}`}
    >
      <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/60 mb-2">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums text-foreground leading-none">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-[12px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function TopicChips() {
  const allTags = feedItems.flatMap((i) => i.tags);
  const counts = allTags.reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4 transition-shadow hover:shadow-subtle">
      <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
        Trending Topics
      </p>
      <div className="flex flex-wrap gap-1.5">
        {top.map(([tag, count]) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary cursor-pointer"
          >
            {tag}
            <span className="text-[9px] text-muted-foreground/40 tabular-nums">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TrendingCard() {
  const recent = feedItems
    .filter((i) => i.evidenceLevel === 'peer-reviewed')
    .slice(0, 3);

  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4 transition-shadow hover:shadow-subtle">
      <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
        Trending This Week
      </p>
      <div className="space-y-2.5">
        {recent.map((item, i) => (
          <div key={item.id} className="flex gap-2.5">
            <span className="text-[13px] font-mono text-muted-foreground/30 tabular-nums leading-tight mt-0.5">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-2">
                {item.title}
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{item.venue}</p>
            </div>
          </div>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <BentoCard label="New Papers" value={papers} subtitle="Past 7 days" />
      <BentoCard label="Trials Updated" value={trials} subtitle="Past 7 days" />
      <BentoCard label="Regulatory" value={regulatory} subtitle="Past 7 days" />
      <BentoCard label="Total Items" value={feedItems.length} subtitle="In database" />
      <TrendingCard />
      <TopicChips />
      <div className="col-span-2 lg:col-span-2 rounded-lg border border-border-subtle bg-card p-4 transition-shadow hover:shadow-subtle">
        <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
          Most Cited Sources
        </p>
        <div className="space-y-2">
          {['Nature', 'Cell Stem Cell', 'NEJM', 'Science', 'The Lancet'].map((venue, i) => {
            const count = feedItems.filter((item) => item.venue === venue).length;
            return (
              <div key={venue} className="flex items-center justify-between">
                <span className="text-[13px] text-foreground">{venue}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 rounded-full bg-primary/20 w-16">
                    <div
                      className="h-1 rounded-full bg-primary"
                      style={{ width: `${Math.max(20, (count / 5) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground/50 tabular-nums w-4 text-right">
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
