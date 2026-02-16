import Link from 'next/link';
import { notFound } from 'next/navigation';
import { feedItems } from '@/data/items';
import { EvidenceBadge } from '@/components/feed-d/EvidenceBadge';
import { SourcePills } from '@/components/feed-d/SourcePills';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function generateStaticParams() {
  return feedItems.map((item) => ({ id: item.id }));
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = feedItems.find((i) => i.id === id);
  if (!item) notFound();

  return (
    <div className="min-h-screen bg-[#08080a] text-white selection:bg-teal-500/20">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[40%] left-[20%] w-[60%] h-[60%] rounded-full bg-teal-500/[0.02] blur-[100px]" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#08080a]/70 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/d" className="text-[13px] text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              Feed
            </Link>
            <EvidenceBadge level={item.evidenceLevel} />
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
          {/* Venue + Date */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[12px] font-semibold tracking-wide text-teal-400/70">{item.venue}</span>
            <span className="text-white/10 text-[10px]">·</span>
            <time className="text-[12px] font-mono text-white/20 tabular-nums" dateTime={item.date}>
              {formatDate(item.date)}
            </time>
          </div>

          {/* Title */}
          <h1 className="text-[1.875rem] sm:text-[2.25rem] font-semibold leading-[1.15] tracking-tight text-white/95">
            {item.title}
          </h1>

          <p className="mt-4 text-[14px] text-white/25">{item.authors.join(', ')}</p>

          {/* Key Finding */}
          <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-6">
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-teal-400/40 mb-3">Key Finding</p>
            <p className="text-[16px] leading-[1.7] text-white/80">{item.keyFinding}</p>
          </div>

          {/* Tags */}
          <div className="mt-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-white/15 mb-3">Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-white/35">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div className="mt-8 pt-6 border-t border-white/[0.04]">
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-white/15 mb-3">Sources</p>
            <SourcePills doi={item.doi} pubmedId={item.pubmedId} trialId={item.trialId} url={item.url} />
          </div>
        </main>
      </div>
    </div>
  );
}
