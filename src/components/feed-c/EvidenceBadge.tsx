import type { EvidenceLevel } from '@/data/items';

const config: Record<EvidenceLevel, { label: string; icon: string; className: string }> = {
  'peer-reviewed': {
    label: 'Peer-Reviewed',
    icon: '✓',
    className: 'text-emerald-700 bg-emerald-50 border-emerald-200/60 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/40',
  },
  'preprint': {
    label: 'Preprint',
    icon: '○',
    className: 'text-amber-700 bg-amber-50 border-amber-200/60 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800/40',
  },
  'clinical-trial': {
    label: 'Clinical Trial',
    icon: '◆',
    className: 'text-blue-700 bg-blue-50 border-blue-200/60 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800/40',
  },
  'meta-analysis': {
    label: 'Meta-Analysis',
    icon: '◇',
    className: 'text-violet-700 bg-violet-50 border-violet-200/60 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-800/40',
  },
  'regulatory': {
    label: 'Regulatory',
    icon: '▪',
    className: 'text-rose-700 bg-rose-50 border-rose-200/60 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-800/40',
  },
};

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const { label, icon, className } = config[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold leading-none tracking-wide ${className}`}
    >
      <span className="text-[8px]">{icon}</span>
      {label}
    </span>
  );
}
