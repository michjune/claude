import { generateStructuredContent } from './anthropic';
import { SYSTEM_PROMPTS, buildBlogPrompt } from './prompts';
import { getToneSettings, buildToneDirective } from './tone';
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
  const tone = await getToneSettings();

  const userPrompt = buildBlogPrompt({
    title: paper.title,
    abstract: paper.abstract || undefined,
    authors: paper.authors,
    journal_name: paper.journal_name || undefined,
    published_date: paper.published_date || undefined,
    keywords: paper.keywords,
  });

  const systemPrompt = `${SYSTEM_PROMPTS.contentGenerator}\n\n${SYSTEM_PROMPTS.blogPost}${buildToneDirective(tone.tone, tone.blog_style)}`;

  const result = await generateStructuredContent<BlogOutput>(
    systemPrompt,
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
