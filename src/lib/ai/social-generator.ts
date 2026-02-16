import { generateStructuredContent } from './anthropic';
import { SYSTEM_PROMPTS, buildSocialPrompt } from './prompts';
import { buildToneDirective } from './tone';
import type { ToneSettings } from './tone';
import { factCheckContent, buildResearchSummary } from './research-pipeline';
import type { ResearchContext } from './research-pipeline';
import type { Paper } from '@/lib/supabase/types';

interface SocialOutput {
  tweet: string;
  linkedin_post: string;
  instagram_caption: string;
  facebook_post: string;
  tiktok_caption: string;
  youtube_description: string;
}

/**
 * Generate social media content with research-backed accuracy.
 * 1. Generate initial drafts for all platforms
 * 2. Fact-check the longest-form content (LinkedIn)
 * 3. Revise all platforms with corrections
 */
export async function generateSocialContent(
  paper: Paper,
  research: ResearchContext,
  tone: ToneSettings
): Promise<SocialOutput> {
  const researchSummary = buildResearchSummary(research);

  const userPrompt = buildSocialPrompt({
    title: paper.title,
    abstract: paper.abstract || undefined,
    journal_name: paper.journal_name || undefined,
  });

  const systemPrompt = `${SYSTEM_PROMPTS.contentGenerator}\n\n${SYSTEM_PROMPTS.socialMedia}${buildToneDirective(tone.tone, tone.social_style)}${researchSummary}`;

  // Step 1: Generate initial drafts
  console.log('[social-gen] Step 1: Generating initial drafts...');
  const draft = await generateStructuredContent<SocialOutput>(
    systemPrompt,
    userPrompt,
    { temperature: 0.8, maxTokens: 3000 }
  );

  // Step 2: Fact-check the LinkedIn post (longest-form, most claims)
  console.log('[social-gen] Step 2: Fact-checking LinkedIn post...');
  const factCheck = await factCheckContent(
    draft.linkedin_post,
    paper.title,
    paper,
    research.literature
  );

  // If no issues, return as-is
  if (factCheck.issues.length === 0 && factCheck.missing_nuances.length === 0) {
    console.log('[social-gen] Fact-check passed, no revisions needed.');
    return draft;
  }

  // Step 3: Revise all posts with corrections
  console.log(`[social-gen] Step 3: Revising ${factCheck.issues.length} issues...`);
  const revised = await reviseSocialContent(draft, paper, factCheck, tone.tone, tone.social_style, researchSummary);

  return revised;
}

async function reviseSocialContent(
  draft: SocialOutput,
  paper: Paper,
  factCheck: Awaited<ReturnType<typeof factCheckContent>>,
  tone: string,
  socialStyle: string,
  researchSummary: string
): Promise<SocialOutput> {
  const issuesList = factCheck.issues.map(i =>
    `- "${i.claim}" [${i.verdict}]: ${i.suggested_fix}`
  ).join('\n');

  const nuancesList = factCheck.missing_nuances.map(n => `- ${n}`).join('\n');

  const systemPrompt = `You are a science content editor ensuring social media posts are scientifically accurate while remaining engaging. Fix factual issues and add missing nuances WITHOUT making the posts boring or overly technical. Keep platform-specific formatting and character limits.
${researchSummary}

Respond with valid JSON matching the exact same format:
{
  "tweet": string (max 280 chars),
  "linkedin_post": string (max 3000 chars),
  "instagram_caption": string (max 2200 chars),
  "facebook_post": string (max 500 chars),
  "tiktok_caption": string (max 150 chars),
  "youtube_description": string (max 500 chars)
}`;

  const userPrompt = `Revise these social media posts about "${paper.title}" to fix accuracy issues while keeping them engaging.

CURRENT DRAFTS:
Tweet: ${draft.tweet}

LinkedIn: ${draft.linkedin_post}

Instagram: ${draft.instagram_caption}

Facebook: ${draft.facebook_post}

TikTok: ${draft.tiktok_caption}

YouTube: ${draft.youtube_description}

FACT-CHECK ISSUES TO FIX:
${issuesList}

${nuancesList ? `MISSING NUANCES:\n${nuancesList}` : ''}

Fix these issues across ALL platforms. Keep the tone ${tone}. ${socialStyle}`;

  return generateStructuredContent<SocialOutput>(systemPrompt, userPrompt, {
    temperature: 0.7,
    maxTokens: 3000,
  });
}
