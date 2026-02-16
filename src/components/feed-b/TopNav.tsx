'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TopNavProps {
  onSearch?: (query: string) => void;
}

export function TopNav({ onSearch }: TopNavProps) {
  const [query, setQuery] = useState('');

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border-subtle">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-6 h-14">
          {/* Logo */}
          <Link href="/b" className="shrink-0 flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-[11px] font-bold text-primary-foreground">SP</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground hidden sm:block">
              StemCell Pulse
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40"
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
                placeholder="Search papers, trials, topics..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                className="w-full h-9 rounded-lg border border-border-subtle bg-surface/50 pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded border border-border-subtle bg-muted/50 px-1.5 text-[10px] font-mono text-muted-foreground/40">
                /
              </kbd>
            </div>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/b/methodology"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Sources
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
