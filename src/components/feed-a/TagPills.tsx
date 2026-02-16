export function TagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/60 dark:bg-muted/40"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
