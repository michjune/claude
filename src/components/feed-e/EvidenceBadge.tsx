import type { EvidenceLevel } from '@/data/items';

const config: Record<EvidenceLevel, { label: string; bg: string; glow: string }> = {
  'peer-reviewed': {
    label: 'Peer-Reviewed',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.1)]',
  },
  'preprint': {
    label: 'Preprint',
    bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.1)]',
  },
  'clinical-trial': {
    label: 'Clinical Trial',
    bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
    glow: 'shadow-[0_0_8px_rgba(59,130,246,0.1)]',
  },
  'meta-analysis': {
    label: 'Meta-Analysis',
    bg: 'bg-violet-50 text-violet-700 border-violet-200/80',
    glow: 'shadow-[0_0_8px_rgba(139,92,246,0.1)]',
  },
  'regulatory': {
    label: 'Regulatory',
    bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    glow: 'shadow-[0_0_8px_rgba(244,63,94,0.08)]',
  },
};

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const { label, bg, glow } = config[level];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${bg} ${glow}`}>
      {label}
    </span>
  );
}
