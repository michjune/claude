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
      className="group block rounded-lg border overflow-hidden hover:border-primary transition-colors"
    >
      {ogImageUrl && (
        <div className="relative aspect-[1200/630] w-full">
          <Image
            src={ogImageUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="p-6">
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
      </div>
    </Link>
  );
}
