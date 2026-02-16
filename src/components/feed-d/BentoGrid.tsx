import Link from 'next/link';
import { feedItems } from '@/data/items';
import { GlassCard } from './GlassCard';

function countRecent(days: number, filter?: (item: typeof feedItems[0]) => boolean) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return feedItems.filter(
    (item) => new Date(item.date) >= cutoff && (filter ? filter(item) : true)
  ).length;
}

function StatBlock({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <GlassCard>
      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-white/25 mb-2">{label}</p>
      <p className="text-3xl font-semibold tabular-nums text-white/90 leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 text-[11px] text-white/20">{detail}</p>
    </GlassCard>
  );
}

export function BentoGrid() {
  const papers = countRecent(7, (i) => i.sourceType === 'journal');
  const trials = countRecent(7, (i) => i.sourceType === 'trial');
  const regulatory = countRecent(7, (i) => i.sourceType === 'news');

  const trending = feedItems
    .filter((i) => i.evidenceLevel === 'peer-reviewed' || i.evidenceLevel === 'meta-analysis')
    .slice(0, 4);

  const allTags = feedItems.flatMap((i) => i.tags);
  const counts = allTags.reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  const topTopics = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Stat cards */}
      <StatBlock label="Papers" value={papers} detail="past 7 days" />
      <StatBlock label="Trials" value={trials} detail="past 7 days" />
      <StatBlock label="Regulatory" value={regulatory} detail="past 7 days" />
      <StatBlock label="Database" value={feedItems.length} detail="total items" />

      {/* Trending - spans 2 cols */}
      <GlassCard glow className="col-span-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-teal-400/50 mb-3">
          Trending This Week
        </p>
        <div className="space-y-3">
          {trending.map((item, i) => (
            <Link key={item.id} href={`/d/item/${item.id}`} className="flex gap-3 group">
              <span className="text-[13px] font-mono text-white/10 tabular-nums mt-0.5 shrink-0 w-5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] leading-snug text-white/70 group-hover:text-white transition-colors line-clamp-2">
                  {item.title}
                </p>
                <p className="text-[10px] text-white/20 mt-0.5">{item.venue}</p>
              </div>
            </Link>
          ))}
        </div>
      </GlassCard>

      {/* Topics - spans 2 cols */}
      <GlassCard className="col-span-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-white/25 mb-3">
          Topics
        </p>
        <div className="flex flex-wrap gap-1.5">
          {topTopics.map(([tag, count]) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40 hover:text-white/70 hover:border-white/10 hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              {tag}
              <span className="text-[9px] text-white/15 tabular-nums">{count}</span>
            </span>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
