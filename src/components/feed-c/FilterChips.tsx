'use client';

interface FilterChipsProps {
  activeSource: string;
  onFilterSource: (type: string) => void;
}

const filters = [
  { value: 'all', label: 'All' },
  { value: 'journal', label: 'Journals' },
  { value: 'trial', label: 'Clinical Trials' },
  { value: 'news', label: 'Regulatory' },
];

export function FilterChips({ activeSource, onFilterSource }: FilterChipsProps) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Filter by source type">
      {filters.map(({ value, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={activeSource === value}
          onClick={() => onFilterSource(value)}
          className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            activeSource === value
              ? 'bg-foreground text-background shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
