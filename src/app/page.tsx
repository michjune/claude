import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WebSiteJsonLd } from '@/components/seo/JsonLd';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stemcellpulse.com';

export const metadata: Metadata = {
  title: 'StemCell Pulse - AI-Powered Stem Cell Research Summaries',
  description:
    'Stay updated with the latest stem cell research from Nature, Cell, Science, and other high-impact journals. AI-powered summaries, blog posts, and insights updated daily.',
  openGraph: {
    title: 'StemCell Pulse - AI-Powered Stem Cell Research Summaries',
    description:
      'Stay updated with the latest stem cell research from high-impact journals. AI-powered summaries updated daily.',
    type: 'website',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StemCell Pulse - AI-Powered Stem Cell Research',
    description:
      'AI-powered summaries of the latest stem cell research from high-impact journals.',
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const { data: latestPosts } = await supabase
    .from('content')
    .select('id, title, slug, summary, published_at, seo_description')
    .eq('content_type', 'blog_post')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6);

  return (
    <div className="flex min-h-screen flex-col">
      <WebSiteJsonLd />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="container py-20 md:py-32 text-center">
          <p className="text-sm font-medium text-primary tracking-wide uppercase mb-4">
            AI-Powered Research Intelligence
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            Stem Cell Research,
            <br />
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The latest from Nature, Cell, Science, and other high-impact journals.
            Summarized daily by AI. Built for researchers who value their time.
          </p>
          <div className="mt-10 flex gap-3 justify-center">
            <Link
              href="/posts"
              className="inline-flex items-center justify-center rounded-full text-sm font-medium bg-primary text-primary-foreground h-12 px-8 hover:bg-primary/90 transition-all duration-200 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Read Latest Research
            </Link>
            <Link
              href="/newsletter"
              className="inline-flex items-center justify-center rounded-full text-sm font-medium border border-border bg-background hover:bg-accent h-12 px-8 transition-all duration-200 hover:-translate-y-0.5"
            >
              Subscribe
            </Link>
          </div>
        </section>

        {/* Latest Posts */}
        <section className="container pb-20">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-semibold tracking-tight">Latest Posts</h2>
            <Link href="/posts" className="text-sm text-primary hover:text-primary/80 transition-colors">
              View all
            </Link>
          </div>
          {latestPosts && latestPosts.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className="group relative rounded-2xl border bg-card p-6 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {post.summary || post.seo_description}
                  </p>
                  {post.published_at && (
                    <p className="mt-4 text-xs text-muted-foreground/70">
                      {new Date(post.published_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">
                No posts yet. Check back soon for AI-powered stem cell research summaries.
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
