'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { feedItems } from '@/data/items';
import { BentoGrid } from '@/components/feed-d/BentoGrid';
import { ArticleCard } from '@/components/feed-d/ArticleCard';

export default function FeedDPage() {
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
    <div className="min-h-screen bg-[#08080a] text-white selection:bg-teal-500/20">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-teal-500/[0.03] blur-[120px] animate-[drift_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/[0.02] blur-[100px] animate-[drift_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-violet-500/[0.02] blur-[80px] animate-[drift_18s_ease-in-out_infinite_2s]" />
      </div>

      {/* Subtle grid texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10">
        {/* Nav */}
        <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#08080a]/70 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-14">
            <Link href="/d" className="flex items-center gap-2.5 group">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-[0_0_16px_rgba(20,184,166,0.25)] group-hover:shadow-[0_0_24px_rgba(20,184,166,0.35)] transition-shadow">
                <span className="text-[10px] font-bold text-white tracking-tight">SP</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-white/90 hidden sm:block">
                StemCell Pulse
              </span>
            </Link>
            <nav className="flex items-center gap-5">
              <Link href="/d/methodology" className="text-[13px] text-white/30 hover:text-white/70 transition-colors">
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
              <div className="h-px w-1/3 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent animate-[slideRight_8s_linear_infinite]" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/[0.06] px-3 py-1 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                </span>
                <span className="text-[11px] font-medium text-teal-400/90">Live Intelligence Feed</span>
              </div>

              <h1 className="text-[3rem] sm:text-[3.75rem] lg:text-[4.5rem] font-semibold leading-[1.05] tracking-tight">
                <span className="text-white/95">The future of</span>
                <br />
                <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  stem cell science
                </span>
              </h1>

              <p className="mt-5 text-[17px] leading-[1.6] text-white/35 max-w-lg">
                Real-time research intelligence. Peer-reviewed papers, clinical trials, and regulatory events from 40+ journals. AI-summarized. Citation-linked.
              </p>

              {/* Search */}
              <div className="mt-8 max-w-xl">
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-teal-500/20 via-transparent to-teal-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                  <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Search papers, trials, topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-[14px] text-white/80 placeholder:text-white/20 transition-all focus:outline-none focus:border-teal-500/30 focus:bg-white/[0.05] backdrop-blur-sm"
                    />
                    <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded border border-white/[0.08] bg-white/[0.03] px-1.5 text-[10px] font-mono text-white/15">
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
                <h2 className="text-[15px] font-semibold text-white/80">Feed</h2>
                <div className="flex items-center gap-1">
                  {filters.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSourceFilter(value)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                        sourceFilter === value
                          ? 'bg-white/10 text-white/90 shadow-[0_0_12px_rgba(255,255,255,0.04)]'
                          : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[11px] font-mono text-white/15 tabular-nums">{filtered.length} items</span>
            </div>

            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-[14px] text-white/25">No results match your filters.</p>
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
          <footer className="mt-20 pt-6 border-t border-white/[0.04] flex items-center justify-between">
            <p className="text-[11px] text-white/15 font-mono">StemCell Pulse</p>
            <p className="text-[11px] text-white/15 font-mono">Sources verified daily</p>
          </footer>
        </main>
      </div>

      {/* Keyframe animations */}
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
