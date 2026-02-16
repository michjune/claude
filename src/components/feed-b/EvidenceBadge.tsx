import type { EvidenceLevel } from '@/data/items';

const config: Record<EvidenceLevel, { label: string; dot: string }> = {
  'peer-reviewed': { label: 'Peer-Reviewed', dot: 'bg-emerald-500' },
  'preprint': { label: 'Preprint', dot: 'bg-amber-500' },
  'clinical-trial': { label: 'Clinical Trial', dot: 'bg-blue-500' },
  'meta-analysis': { label: 'Meta-Analysis', dot: 'bg-violet-500' },
  'regulatory': { label: 'Regulatory', dot: 'bg-rose-500' },
};

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const { label, dot } = config[level];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
