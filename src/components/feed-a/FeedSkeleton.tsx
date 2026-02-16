import { Skeleton } from '@/components/ui/skeleton';

function FeedItemSkeleton() {
  return (
    <div className="py-5 border-b border-border-subtle">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <Skeleton className="h-5 w-full max-w-xl mb-1.5" />
      <Skeleton className="h-3 w-48 mb-2" />
      <Skeleton className="h-4 w-full max-w-lg mb-1" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex gap-1.5">
        <Skeleton className="h-4 w-14 rounded" />
        <Skeleton className="h-4 w-12 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <FeedItemSkeleton key={i} />
      ))}
    </div>
  );
}
