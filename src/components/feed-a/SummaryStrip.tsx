import { feedItems } from '@/data/items';

function countRecent(days: number, filter?: (item: typeof feedItems[0]) => boolean) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return feedItems.filter(
    (item) => new Date(item.date) >= cutoff && (filter ? filter(item) : true)
  ).length;
}

export function SummaryStrip() {
  const papers = countRecent(7, (i) => i.sourceType === 'journal');
  const trials = countRecent(7, (i) => i.sourceType === 'trial');
  const regulatory = countRecent(7, (i) => i.sourceType === 'news');

  const stats = [
    { label: 'New Papers', value: papers, suffix: '7d' },
    { label: 'Trials Updated', value: trials, suffix: '7d' },
    { label: 'Regulatory Events', value: regulatory, suffix: '7d' },
  ];

  return (
    <div className="flex items-center gap-8 py-4 border-b border-border">
      <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground/60 hidden sm:block">
        This Week
      </span>
      {stats.map(({ label, value, suffix }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
          <span className="text-[12px] text-muted-foreground">
            {label}
          </span>
          <span className="text-[10px] text-muted-foreground/50 font-mono">{suffix}</span>
        </div>
      ))}
    </div>
  );
}
