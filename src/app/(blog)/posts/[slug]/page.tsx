import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Content } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowLeft, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PostAnalytics } from '@/components/blog/PostAnalytics';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stemcellpulse.com';

export const revalidate = 3600;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string): Promise<Content | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('content')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('content_type', 'blog_post')
    .single();
  return data as Content | null;
}

function getReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

export async function generateStaticParams() {
  const supabase = createAdminClient();
  const { data: posts } = await supabase
    .from('content')
    .select('slug')
    .eq('content_type', 'blog_post')
    .eq('status', 'published');

  return (posts || []).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found' };

  const keywords = (post.metadata?.keywords as string[]) || [];
  const postUrl = `${BASE_URL}/posts/${slug}`;

  return {
    title: post.seo_title || post.title || 'StemCell Pulse',
    description: post.seo_description || post.summary || undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: [{ name: 'StemCell Pulse', url: BASE_URL }],
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title: post.seo_title || post.title || 'StemCell Pulse',
      description: post.seo_description || post.summary || undefined,
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: ['StemCell Pulse'],
      section: (post.metadata?.article_section as string) || 'Stem Cell Research',
      tags: keywords,
      images: post.og_image_url ? [post.og_image_url] : undefined,
      url: postUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo_title || post.title || 'StemCell Pulse',
      description: post.seo_description || post.summary || undefined,
    },
  };
}

function renderMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-4 text-muted-foreground">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  function renderInline(text: string): React.ReactNode {
    // Handle **bold**, *italic*, and [links](url)
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let inlineKey = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Italic
      const italicMatch = remaining.match(/\*(.+?)\*/);
      // Link
      const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);

      type InlineMatch = { index: number; length: number; node: React.ReactNode };
      const candidates: InlineMatch[] = [];

      if (boldMatch && boldMatch.index !== undefined) {
        candidates.push({
          index: boldMatch.index,
          length: boldMatch[0].length,
          node: <strong key={inlineKey++} className="font-semibold text-foreground">{boldMatch[1]}</strong>,
        });
      }

      if (linkMatch && linkMatch.index !== undefined) {
        candidates.push({
          index: linkMatch.index,
          length: linkMatch[0].length,
          node: (
            <a
              key={inlineKey++}
              href={linkMatch[2]}
              className="text-primary underline hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {linkMatch[1]}
            </a>
          ),
        });
      }

      if (
        italicMatch &&
        italicMatch.index !== undefined &&
        !(boldMatch && boldMatch.index !== undefined && boldMatch.index <= italicMatch.index)
      ) {
        candidates.push({
          index: italicMatch.index,
          length: italicMatch[0].length,
          node: <em key={inlineKey++}>{italicMatch[1]}</em>,
        });
      }

      const firstMatch = candidates.sort((a, b) => a.index - b.index)[0] || null;

      if (firstMatch) {
        if (firstMatch.index > 0) {
          parts.push(remaining.slice(0, firstMatch.index));
        }
        parts.push(firstMatch.node);
        remaining = remaining.slice(firstMatch.index + firstMatch.length);
      } else {
        parts.push(remaining);
        remaining = '';
      }
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList();
      continue;
    }

    // Heading ##
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-xl font-semibold mt-8 mb-3">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-2xl font-bold mt-10 mb-4">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={key++} className="text-3xl font-bold mt-10 mb-4">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={key++} className="text-base leading-relaxed text-muted-foreground my-4">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  return elements;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const keywords = (post.metadata?.keywords as string[]) || [];
  const readingTime = getReadingTime(post.body);
  const wordCount = getWordCount(post.body);
  const postUrl = `${BASE_URL}/posts/${slug}`;

  return (
    <article className="container max-w-3xl py-10">
      <ArticleJsonLd
        title={post.title || ''}
        description={post.seo_description || post.summary || ''}
        url={postUrl}
        imageUrl={post.og_image_url || undefined}
        datePublished={post.published_at || post.created_at}
        dateModified={post.updated_at || undefined}
        keywords={keywords}
        wordCount={wordCount}
        articleSection={(post.metadata?.article_section as string) || 'Stem Cell Research'}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'Blog', url: `${BASE_URL}/posts` },
          { name: post.title || '', url: postUrl },
        ]}
      />

      <Link
        href="/posts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      {post.og_image_url && (
        <div className="relative aspect-[1200/630] w-full rounded-lg overflow-hidden mb-8">
          <Image
            src={post.og_image_url}
            alt={post.title || ''}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      )}

      {(post.metadata?.unsplash_author as string) && (
        <p className="text-xs text-muted-foreground mb-4">
          Photo by{' '}
          <a
            href={`${post.metadata.unsplash_author_url}?utm_source=stemcell_pulse&utm_medium=referral`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            {post.metadata.unsplash_author as string}
          </a>
          {' '}on{' '}
          <a
            href="https://unsplash.com/?utm_source=stemcell_pulse&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Unsplash
          </a>
        </p>
      )}

      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight leading-tight mb-4">
          {post.title}
        </h1>

        {post.summary && (
          <p className="text-xl text-muted-foreground mb-4">{post.summary}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {post.published_at
              ? format(new Date(post.published_at), 'MMMM d, yyyy')
              : format(new Date(post.created_at), 'MMMM d, yyyy')}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {readingTime} min read
          </div>
        </div>

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {keywords.map((keyword) => (
              <Link key={keyword} href={`/topics/${encodeURIComponent(keyword.toLowerCase())}`}>
                <Badge variant="outline">{keyword}</Badge>
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="prose-stem">
        {renderMarkdown(post.body)}
      </div>

      <PostAnalytics contentId={post.id} />
    </article>
  );
}
