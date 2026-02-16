import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EvidenceBadge } from '@/components/research/EvidenceBadge';
import { SourceLinks } from '@/components/research/SourceLinks';
import { TagPills } from '@/components/research/TagPills';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: paper } = await supabase
    .from('papers')
    .select('title, abstract, journal_name')
    .eq('id', id)
    .single();

  if (!paper) return { title: 'Paper Not Found' };

  return {
    title: `${paper.title} | StemCell Pulse`,
    description: paper.abstract?.slice(0, 160) || `Research paper from ${paper.journal_name}`,
  };
}

export default async function PaperDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: paper } = await supabase
    .from('papers')
    .select('*')
    .eq('id', id)
    .single();

  if (!paper) notFound();

  // If content was generated, find the blog post
  let blogSlug: string | null = null;
  if (paper.content_generated) {
    const { data: content } = await supabase
      .from('content')
      .select('slug')
      .eq('paper_id', paper.id)
      .eq('content_type', 'blog_post')
      .eq('status', 'published')
      .single();
    blogSlug = content?.slug || null;
  }

  const publishedDate = paper.published_date
    ? new Date(paper.published_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to Feed
          </Link>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {paper.journal_name && (
              <span className="text-[12px] font-semibold uppercase tracking-wide text-primary/80">
                {paper.journal_name}
              </span>
            )}
            {paper.journal_name && publishedDate && (
              <span className="text-[11px] text-muted-foreground/30">|</span>
            )}
            {publishedDate && (
              <time className="text-[12px] font-mono text-muted-foreground/60 tabular-nums">
                {publishedDate}
              </time>
            )}
            <EvidenceBadge level={paper.evidence_level} />
          </div>

          {/* Title */}
          <h1 className="text-[1.75rem] font-semibold leading-[1.25] tracking-tight text-foreground">
            {paper.title}
          </h1>

          {/* Authors */}
          {paper.authors.length > 0 && (
            <p className="mt-3 text-[14px] text-muted-foreground/70">
              {paper.authors.join(', ')}
            </p>
          )}

          {/* Key finding callout */}
          {paper.key_finding && (
            <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-[11px] font-mono uppercase tracking-[0.06em] text-primary/60 mb-1.5">
                Key Finding
              </p>
              <p className="text-[15px] leading-[1.55] text-foreground font-medium">
                {paper.key_finding}
              </p>
            </div>
          )}

          {/* Abstract */}
          {paper.abstract && (
            <div className="mt-8">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/50 mb-3">
                Abstract
              </h2>
              <p className="text-[15px] leading-[1.7] text-foreground/90">
                {paper.abstract}
              </p>
            </div>
          )}

          {/* Keywords + MeSH */}
          {(paper.keywords.length > 0 || paper.mesh_terms.length > 0) && (
            <div className="mt-8">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/50 mb-3">
                Keywords
              </h2>
              <TagPills tags={[...paper.keywords, ...paper.mesh_terms]} />
            </div>
          )}

          {/* Source links */}
          <div className="mt-8">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground/50 mb-3">
              Sources
            </h2>
            <SourceLinks
              doi={paper.doi}
              pubmedId={paper.pmid}
              trialId={paper.trial_id}
              url={paper.source_url}
            />
          </div>

          {/* Blog post link */}
          {blogSlug && (
            <div className="mt-8 pt-6 border-t border-border-subtle">
              <Link
                href={`/posts/${blogSlug}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-[14px] font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                Read the AI-generated blog post
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
