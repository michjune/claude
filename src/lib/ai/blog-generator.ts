import { generateStructuredContent } from './openai';
import { SYSTEM_PROMPTS, buildBlogPrompt } from './prompts';
import type { Paper } from '@/lib/supabase/types';

interface BlogOutput {
  title: string;
  slug: string;
  body: string;
  summary: string;
  seo_title: string;
  seo_description: string;
  keywords: string[];
}

export async function generateBlogPost(paper: Paper): Promise<BlogOutput> {
  const userPrompt = buildBlogPrompt({
    title: paper.title,
    abstract: paper.abstract || undefined,
    authors: paper.authors,
    journal_name: paper.journal_name || undefined,
    published_date: paper.published_date || undefined,
    keywords: paper.keywords,
  });

  const result = await generateStructuredContent<BlogOutput>(
    `${SYSTEM_PROMPTS.contentGenerator}\n\n${SYSTEM_PROMPTS.blogPost}`,
    userPrompt,
    { temperature: 0.7, maxTokens: 4096 }
  );

  // Sanitize slug
  result.slug = result.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return result;
}
