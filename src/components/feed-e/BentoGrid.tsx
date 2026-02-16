import Link from 'next/link';
import { feedItems } from '@/data/items';

function countRecent(days: number, filter?: (item: typeof feedItems[0]) => boolean) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return feedItems.filter(
    (item) => new Date(item.date) >= cutoff && (filter ? filter(item) : true)
  ).length;
}

function StatCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 transition-all duration-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:border-gray-300/80">
      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-gray-400 mb-2">{label}</p>
      <p className="text-3xl font-semibold tabular-nums text-gray-900 leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 text-[11px] text-gray-400">{detail}</p>
    </div>
  );
}

function TrendingCard() {
  const trending = feedItems
    .filter((i) => i.evidenceLevel === 'peer-reviewed' || i.evidenceLevel === 'meta-analysis')
    .slice(0, 4);

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 col-span-2 transition-all duration-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:border-gray-300/80 relative overflow-hidden">
      {/* Subtle accent glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-teal-500/[0.04] blur-2xl pointer-events-none" />
      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-teal-600/60 mb-3 relative">
        Trending This Week
      </p>
      <div className="space-y-3 relative">
        {trending.map((item, i) => (
          <Link key={item.id} href={`/e/item/${item.id}`} className="flex gap-3 group">
            <span className="text-[13px] font-mono text-gray-300 tabular-nums mt-0.5 shrink-0 w-5">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] leading-snug text-gray-700 group-hover:text-teal-700 transition-colors line-clamp-2">
                {item.title}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.venue}</p>
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
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 col-span-2 transition-all duration-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:border-gray-300/80">
      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-gray-400 mb-3">Topics</p>
      <div className="flex flex-wrap gap-1.5">
        {top.map(([tag, count]) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-gray-50/50 px-2.5 py-1 text-[11px] text-gray-500 hover:text-teal-700 hover:border-teal-200 hover:bg-teal-50/40 transition-all cursor-pointer"
          >
            {tag}
            <span className="text-[9px] text-gray-300 tabular-nums">{count}</span>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Papers" value={papers} detail="past 7 days" />
      <StatCard label="Trials" value={trials} detail="past 7 days" />
      <StatCard label="Regulatory" value={regulatory} detail="past 7 days" />
      <StatCard label="Database" value={feedItems.length} detail="total items" />
      <TrendingCard />
      <TopicsCard />
    </div>
  );
}
