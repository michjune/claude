import type { EvidenceLevel } from '@/data/items';

const config: Record<EvidenceLevel, { label: string; className: string }> = {
  'peer-reviewed': {
    label: 'Peer-Reviewed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  'preprint': {
    label: 'Preprint',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  },
  'clinical-trial': {
    label: 'Clinical Trial',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  },
  'meta-analysis': {
    label: 'Meta-Analysis',
    className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800',
  },
  'regulatory': {
    label: 'Regulatory',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
  },
};

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const { label, className } = config[level];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight border ${className}`}>
      {label}
    </span>
  );
}
