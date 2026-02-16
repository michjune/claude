import type { EvidenceLevel } from '@/data/items';

const config: Record<EvidenceLevel, { label: string; glow: string; bg: string }> = {
  'peer-reviewed': {
    label: 'Peer-Reviewed',
    glow: 'shadow-[0_0_8px_rgba(52,211,153,0.15)]',
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  'preprint': {
    label: 'Preprint',
    glow: 'shadow-[0_0_8px_rgba(251,191,36,0.15)]',
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  'clinical-trial': {
    label: 'Clinical Trial',
    glow: 'shadow-[0_0_8px_rgba(96,165,250,0.15)]',
    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  'meta-analysis': {
    label: 'Meta-Analysis',
    glow: 'shadow-[0_0_8px_rgba(167,139,250,0.15)]',
    bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  },
  'regulatory': {
    label: 'Regulatory',
    glow: 'shadow-[0_0_8px_rgba(251,113,133,0.15)]',
    bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
};

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const { label, glow, bg } = config[level];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${bg} ${glow}`}>
      {label}
    </span>
  );
}
