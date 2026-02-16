import { Skeleton } from '@/components/ui/skeleton';

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-4/5 mb-2" />
      <Skeleton className="h-3 w-40 mb-2" />
      <Skeleton className="h-3.5 w-full mb-1" />
      <Skeleton className="h-3.5 w-3/4 mb-3" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
