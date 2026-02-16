'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TopNavProps {
  onSearch?: (query: string) => void;
  onFilterSource?: (type: string) => void;
  activeSource?: string;
}

export function TopNav({ onSearch, onFilterSource, activeSource = 'all' }: TopNavProps) {
  const [query, setQuery] = useState('');

  const sourceFilters = [
    { value: 'all', label: 'All' },
    { value: 'journal', label: 'Journals' },
    { value: 'trial', label: 'Trials' },
    { value: 'news', label: 'News' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-3xl px-4">
        {/* Top row: logo + search + methodology link */}
        <div className="flex items-center gap-4 h-14">
          <Link href="/a" className="shrink-0">
            <span className="font-serif text-lg font-medium tracking-tight text-foreground">
              StemCell Pulse
            </span>
          </Link>

          <div className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                placeholder="Search papers, trials, news..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                className="w-full h-8 rounded-md border border-border bg-surface pl-8 pr-3 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          </div>

          <Link
            href="/a/methodology"
            className="shrink-0 text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors hidden sm:block"
          >
            Methodology
          </Link>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-1 pb-2 -mt-0.5">
          {sourceFilters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterSource?.(value)}
              className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
                activeSource === value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
