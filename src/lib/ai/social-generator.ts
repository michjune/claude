import { generateStructuredContent } from './openai';
import { SYSTEM_PROMPTS, buildSocialPrompt } from './prompts';
import type { Paper } from '@/lib/supabase/types';

interface SocialOutput {
  tweet: string;
  linkedin_post: string;
  instagram_caption: string;
  facebook_post: string;
  tiktok_caption: string;
  youtube_description: string;
}

export async function generateSocialContent(paper: Paper): Promise<SocialOutput> {
  const userPrompt = buildSocialPrompt({
    title: paper.title,
    abstract: paper.abstract || undefined,
    journal_name: paper.journal_name || undefined,
  });

  return generateStructuredContent<SocialOutput>(
    `${SYSTEM_PROMPTS.contentGenerator}\n\n${SYSTEM_PROMPTS.socialMedia}`,
    userPrompt,
    { temperature: 0.8, maxTokens: 3000 }
  );
}
