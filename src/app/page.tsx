import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="container py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-primary">Stem Cell</span> Research,{' '}
            <span className="text-primary">Simplified</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered summaries of the latest stem cell research from
            Nature, Cell, Science, and other high-impact journals. Updated daily.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Link
              href="/posts"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-11 px-8 hover:bg-primary/90 transition-colors"
            >
              Read Latest Research
            </Link>
            <Link
              href="/newsletter"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-11 px-8 transition-colors"
            >
              Subscribe
            </Link>
          </div>
        </section>

        {/* Latest Posts */}
        <section className="container pb-16">
          <h2 className="text-2xl font-bold mb-8">Latest Posts</h2>
          {latestPosts && latestPosts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className="group rounded-lg border p-6 hover:border-primary transition-colors"
                >
                  <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {post.summary || post.seo_description}
                  </p>
                  {post.published_at && (
                    <p className="mt-3 text-xs text-muted-foreground">
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
            <p className="text-muted-foreground text-center py-12">
              No posts yet. Check back soon for AI-powered stem cell research summaries.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
