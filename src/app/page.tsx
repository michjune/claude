import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ResearchStats } from '@/components/research/ResearchStats';
import { UnifiedFeed } from '@/components/research/UnifiedFeed';
import { WebSiteJsonLd } from '@/components/seo/JsonLd';
import type { Metadata } from 'next';
import type { Paper, Content } from '@/lib/supabase/types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stemcellpulse.com';

export const metadata: Metadata = {
  title: 'StemCell Pulse - Live Stem Cell Research Intelligence',
  description:
    'Live intelligence feed tracking stem cell research from Nature, Cell, Science, and 40+ high-impact journals. Papers, clinical trials, and AI-powered summaries updated daily.',
  openGraph: {
    title: 'StemCell Pulse - Live Stem Cell Research Intelligence',
    description:
      'Live intelligence feed tracking stem cell research from high-impact journals. Updated daily.',
    type: 'website',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StemCell Pulse - Live Research Intelligence',
    description:
      'Live intelligence feed tracking stem cell research from high-impact journals.',
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: papers }, { data: blogPosts }] = await Promise.all([
    supabase
      .from('papers')
      .select('*')
      .order('published_date', { ascending: false })
      .limit(50),
    supabase
      .from('content')
      .select('*')
      .eq('content_type', 'blog_post')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <WebSiteJsonLd />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="container py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Live Intelligence Feed
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Stem Cell Research,
              <br />
              <span className="text-primary">Tracked in Real Time.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Papers, clinical trials, and regulatory updates from 40+ high-impact journals. Summarized daily by AI. Trusted by clinicians, scientists, and biotech leaders.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="container pb-8">
          <ResearchStats />
        </section>

        {/* Unified Feed */}
        <section className="container pb-20">
          <UnifiedFeed
            papers={(papers as Paper[]) || []}
            blogPosts={(blogPosts as Content[]) || []}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
