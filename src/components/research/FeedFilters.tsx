'use client';

interface FeedFiltersProps {
  activeSource: string;
  activeSort: string;
  onFilterSource: (type: string) => void;
  onSort: (sort: string) => void;
  itemCount: number;
}

export function FeedFilters({ activeSource, activeSort, onFilterSource, onSort, itemCount }: FeedFiltersProps) {
  const sourceFilters = [
    { value: 'all', label: 'All' },
    { value: 'paper', label: 'Papers' },
    { value: 'blog', label: 'Blog Posts' },
    { value: 'trial', label: 'Trials' },
    { value: 'news', label: 'Regulatory' },
  ];

  const sortOptions = [
    { value: 'date', label: 'Newest' },
    { value: 'venue', label: 'By Journal' },
  ];

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        {/* Source chips */}
        <div className="flex items-center gap-1.5">
          {sourceFilters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterSource(value)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                activeSource === value
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-surface text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground/40 tabular-nums">
          {itemCount} items
        </span>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1">
        {sortOptions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onSort(value)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              activeSort === value
                ? 'text-foreground'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
