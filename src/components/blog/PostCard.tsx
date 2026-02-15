import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface PostCardProps {
  title: string;
  slug: string;
  summary?: string | null;
  publishedAt?: string | null;
  keywords?: string[];
}

export function PostCard({ title, slug, summary, publishedAt, keywords = [] }: PostCardProps) {
  return (
    <Link
      href={`/posts/${slug}`}
      className="group block rounded-lg border p-6 hover:border-primary transition-colors"
    >
      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
        {title}
      </h3>

      {summary && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
          {summary}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        {publishedAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}

        {keywords.slice(0, 3).map((kw) => (
          <Badge key={kw} variant="outline" className="text-xs">
            {kw}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
