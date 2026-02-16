import Link from 'next/link';
import type { Content } from '@/lib/supabase/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function BlogPostCard({ post }: { post: Content }) {
  const keywords = (post.metadata?.keywords as string[]) || [];

  return (
    <article className="group rounded-lg border border-border-subtle bg-card p-4 transition-all duration-200 hover:shadow-elevated hover:border-border">
      {/* Top row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Blog Post
        </span>
        {post.published_at && (
          <time className="text-[11px] font-mono text-muted-foreground/50 tabular-nums" dateTime={post.published_at}>
            {formatDate(post.published_at)}
          </time>
        )}
      </div>

      {/* Image */}
      {post.og_image_url && (
        <Link href={`/posts/${post.slug}`} className="block mb-3">
          <div className="aspect-[2/1] rounded-md overflow-hidden bg-muted">
            <img
              src={post.og_image_url}
              alt={post.title || ''}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </Link>
      )}

      {/* Title */}
      <Link href={`/posts/${post.slug}`} className="block">
        <h3 className="text-[15px] font-semibold leading-[1.35] text-foreground group-hover:text-primary transition-colors duration-150 line-clamp-2">
          {post.title}
        </h3>
      </Link>

      {/* Summary */}
      {post.summary && (
        <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground line-clamp-2">
          {post.summary}
        </p>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {keywords.slice(0, 3).map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
