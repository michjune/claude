'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { feedItems } from '@/data/items';
import { BentoGrid } from '@/components/feed-e/BentoGrid';
import { ArticleCard } from '@/components/feed-e/ArticleCard';

export default function FeedEPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const filtered = useMemo(() => {
    let items = feedItems;
    if (sourceFilter !== 'all') {
      items = items.filter((item) => item.sourceType === sourceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.keyFinding.toLowerCase().includes(q) ||
          item.venue.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.authors.some((a) => a.toLowerCase().includes(q))
      );
    }
    return items;
  }, [searchQuery, sourceFilter]);

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'journal', label: 'Journals' },
    { value: 'trial', label: 'Trials' },
    { value: 'news', label: 'Regulatory' },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9] text-gray-900 selection:bg-teal-500/15">
      {/* Ambient background blobs — warm, subtle */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[30%] -left-[15%] w-[70%] h-[70%] rounded-full bg-teal-400/[0.03] blur-[120px] animate-[drift_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[20%] -right-[15%] w-[50%] h-[50%] rounded-full bg-amber-300/[0.03] blur-[100px] animate-[drift_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[30%] right-[5%] w-[35%] h-[35%] rounded-full bg-violet-300/[0.02] blur-[80px] animate-[drift_18s_ease-in-out_infinite_2s]" />
      </div>

      {/* Subtle dot texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.3]"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10">
        {/* Nav — glass */}
        <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-[#fafaf9]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-[#fafaf9]/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-14">
            <Link href="/e" className="flex items-center gap-2.5 group">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-[0_2px_8px_rgba(20,184,166,0.25)] group-hover:shadow-[0_2px_16px_rgba(20,184,166,0.35)] transition-shadow">
                <span className="text-[10px] font-bold text-white tracking-tight">SP</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-gray-900 hidden sm:block">
                StemCell Pulse
              </span>
            </Link>
            <nav className="flex items-center gap-5">
              <Link href="/e/methodology" className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors">
                Methodology
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
          {/* Hero */}
          <section className="pt-20 pb-16 relative">
            {/* Animated accent line */}
            <div className="absolute top-12 left-0 h-px w-full overflow-hidden">
              <div className="h-px w-1/3 bg-gradient-to-r from-transparent via-teal-500/25 to-transparent animate-[slideRight_8s_linear_infinite]" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/[0.06] px-3 py-1 mb-6 shadow-[0_0_12px_rgba(20,184,166,0.06)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-40" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                </span>
                <span className="text-[11px] font-medium text-teal-700">Live Intelligence Feed</span>
              </div>

              <h1 className="text-[3rem] sm:text-[3.75rem] lg:text-[4.5rem] font-semibold leading-[1.05] tracking-tight">
                <span className="text-gray-900">The future of</span>
                <br />
                <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                  stem cell science
                </span>
              </h1>

              <p className="mt-5 text-[17px] leading-[1.6] text-gray-500 max-w-lg">
                Real-time research intelligence. Peer-reviewed papers, clinical trials, and regulatory events from 40+ journals. AI-summarized. Citation-linked.
              </p>

              {/* Search — glow on focus */}
              <div className="mt-8 max-w-xl">
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-teal-500/15 via-transparent to-teal-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                  <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Search papers, trials, topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm pl-11 pr-4 text-[14px] text-gray-900 placeholder:text-gray-400 transition-all focus:outline-none focus:border-teal-400/50 focus:bg-white focus:shadow-[0_0_20px_-4px_rgba(20,184,166,0.12)]"
                    />
                    <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-mono text-gray-300">
                      /
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bento */}
          <section className="pb-10">
            <BentoGrid />
          </section>

          {/* Feed */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[15px] font-semibold text-gray-900">Feed</h2>
                <div className="flex items-center gap-1">
                  {filters.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSourceFilter(value)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                        sourceFilter === value
                          ? 'bg-gray-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[11px] font-mono text-gray-300 tabular-nums">{filtered.length} items</span>
            </div>

            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-[14px] text-gray-400">No results match your filters.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((item) => (
                  <ArticleCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="mt-20 pt-6 border-t border-gray-200/60 flex items-center justify-between">
            <p className="text-[11px] text-gray-300 font-mono">StemCell Pulse</p>
            <p className="text-[11px] text-gray-300 font-mono">Sources verified daily</p>
          </footer>
        </main>
      </div>

      <style jsx global>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes slideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[drift_20s_ease-in-out_infinite\\],
          .animate-\\[drift_25s_ease-in-out_infinite_reverse\\],
          .animate-\\[drift_18s_ease-in-out_infinite_2s\\],
          .animate-\\[slideRight_8s_linear_infinite\\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
