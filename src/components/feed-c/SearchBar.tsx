'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

export function SearchBar({ onSearch, className = '' }: SearchBarProps) {
  const [query, setQuery] = useState('');

  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
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
          onSearch(e.target.value);
        }}
        className="w-full h-10 rounded-lg border border-border-subtle bg-card pl-10 pr-4 text-[14px] placeholder:text-muted-foreground/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        aria-label="Search research feed"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center rounded border border-border-subtle bg-muted/40 px-1.5 text-[10px] font-mono text-muted-foreground/30">
        /
      </kbd>
    </div>
  );
}
