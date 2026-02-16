import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface PostCardProps {
  title: string;
  slug: string;
  summary?: string | null;
  publishedAt?: string | null;
  keywords?: string[];
  ogImageUrl?: string | null;
}

export function PostCard({ title, slug, summary, publishedAt, keywords = [], ogImageUrl }: PostCardProps) {
  return (
    <Link
      href={`/posts/${slug}`}
      className="group block rounded-2xl border bg-card overflow-hidden hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-300"
    >
      {ogImageUrl && (
        <div className="relative aspect-[1200/630] w-full overflow-hidden">
          <Image
            src={ogImageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="p-6">
        <h3 className="font-semibold text-lg leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
          {title}
        </h3>

        {summary && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {summary}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {publishedAt && (
            <span className="text-xs text-muted-foreground/70">
              {new Date(publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}

          {keywords.slice(0, 3).map((kw) => (
            <Badge key={kw} variant="outline" className="text-xs font-normal">
              {kw}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
