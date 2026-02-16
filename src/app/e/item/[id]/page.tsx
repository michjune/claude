import Link from 'next/link';
import { notFound } from 'next/navigation';
import { feedItems } from '@/data/items';
import { EvidenceBadge } from '@/components/feed-e/EvidenceBadge';
import { SourcePills } from '@/components/feed-e/SourcePills';

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
    <div className="min-h-screen bg-[#fafaf9] text-gray-900 selection:bg-teal-500/15">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[30%] left-[20%] w-[50%] h-[50%] rounded-full bg-teal-400/[0.025] blur-[100px]" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-[#fafaf9]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-[#fafaf9]/60">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/e" className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5">
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
            <span className="text-[12px] font-semibold tracking-wide text-teal-600">{item.venue}</span>
            <span className="text-gray-300 text-[10px]">·</span>
            <time className="text-[12px] font-mono text-gray-400 tabular-nums" dateTime={item.date}>
              {formatDate(item.date)}
            </time>
          </div>

          {/* Title */}
          <h1 className="text-[1.875rem] sm:text-[2.25rem] font-semibold leading-[1.15] tracking-tight text-gray-900">
            {item.title}
          </h1>

          <p className="mt-4 text-[14px] text-gray-400">{item.authors.join(', ')}</p>

          {/* Key Finding */}
          <div className="mt-10 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-teal-500/[0.04] blur-xl pointer-events-none" />
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-teal-600/50 mb-3 relative">Key Finding</p>
            <p className="text-[16px] leading-[1.7] text-gray-800 relative">{item.keyFinding}</p>
          </div>

          {/* Tags */}
          <div className="mt-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-gray-400 mb-3">Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full border border-gray-200/80 bg-gray-50/50 px-2.5 py-0.5 text-[11px] text-gray-500">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div className="mt-8 pt-6 border-t border-gray-200/60">
            <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-gray-400 mb-3">Sources</p>
            <SourcePills doi={item.doi} pubmedId={item.pubmedId} trialId={item.trialId} url={item.url} />
          </div>
        </main>
      </div>
    </div>
  );
}
