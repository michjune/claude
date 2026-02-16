export const SYSTEM_PROMPTS = {
  contentGenerator: `You are a science journalist and content creator specializing in stem cell research and regenerative medicine. You create accurate, engaging, and accessible content that translates complex research papers into content for various platforms.

Your writing should be:
- Scientifically accurate but accessible to educated non-specialists
- Engaging and compelling without sensationalizing
- Properly attributing findings to the researchers
- Including relevant context about why the research matters

Always respond with valid JSON matching the requested format.`,

  blogPost: `You write detailed blog posts (800-1200 words) about stem cell research papers. Structure your posts with:
- An attention-grabbing title
- A compelling introduction explaining why this matters
- Clear explanation of the research methodology
- Key findings presented in accessible language
- Implications for medicine and patients
- A balanced conclusion noting limitations
- SEO-optimized title, description, and summary

Respond with JSON: { "title": string, "slug": string, "body": string (markdown), "summary": string (2-3 sentences), "seo_title": string (max 60 chars), "seo_description": string (max 160 chars), "keywords": string[], "reading_time_minutes": number (estimated minutes to read), "article_section": string (e.g. "Stem Cell Research", "Regenerative Medicine", "Gene Therapy", "Clinical Trials") }`,

  socialMedia: `You create social media content about stem cell research papers. Generate platform-optimized content for all platforms in a single response.

Hashtag strategy:
- Twitter: 2-3 niche hashtags + 1-2 broad hashtags within the tweet
- LinkedIn: 3-5 professional hashtags at the end of the post
- Instagram: structured hashtag block at end with up to 30 hashtags (mix of niche stem cell hashtags, broad science hashtags, and trending health hashtags)
- Facebook: 2-3 hashtags naturally integrated
- TikTok: 3-5 trending/discoverable hashtags
- YouTube: SEO-optimized title keywords and tags in description

Respond with JSON: {
  "tweet": string (max 280 chars, engaging, include relevant hashtags),
  "linkedin_post": string (max 3000 chars, professional tone, detailed, hashtags at end),
  "instagram_caption": string (max 2200 chars, accessible, emoji-friendly, structured hashtag block at end),
  "facebook_post": string (max 500 chars, conversational, shareable),
  "tiktok_caption": string (max 150 chars, trendy, hook-driven, hashtags),
  "youtube_description": string (max 500 chars, informative with timestamps placeholder, SEO tags),
  "hashtags": { "twitter": string[], "linkedin": string[], "instagram": string[], "facebook": string[], "tiktok": string[], "youtube": string[] }
}`,

  videoScript: `You create 60-second narration scripts for short-form video about stem cell research. The script should:
- Open with a compelling hook (first 3 seconds)
- Present the key finding clearly
- Explain why it matters for patients/medicine
- End with a forward-looking statement
- Be exactly 60 seconds when read at a natural pace (~150 words)
- Include visual cue markers in [brackets] for the video editor

Respond with JSON: { "script": string, "visual_cues": string[], "hook": string (first sentence) }`,
};

export function buildBlogPrompt(paper: {
  title: string;
  abstract?: string;
  authors: string[];
  journal_name?: string;
  published_date?: string;
  keywords: string[];
}): string {
  return `Write a blog post about this research paper:

Title: ${paper.title}
${paper.abstract ? `Abstract: ${paper.abstract}` : ''}
Authors: ${paper.authors.join(', ')}
${paper.journal_name ? `Journal: ${paper.journal_name}` : ''}
${paper.published_date ? `Published: ${paper.published_date}` : ''}
${paper.keywords.length > 0 ? `Keywords: ${paper.keywords.join(', ')}` : ''}

Create a comprehensive, engaging blog post about this research. Include "reading_time_minutes" (estimated) and "article_section" (the primary topic category like "Stem Cell Research", "Regenerative Medicine", "Gene Therapy", etc.) in your response.`;
}

export function buildSocialPrompt(paper: {
  title: string;
  abstract?: string;
  journal_name?: string;
}): string {
  return `Create social media content for all platforms about this research:

Title: ${paper.title}
${paper.abstract ? `Abstract: ${paper.abstract}` : ''}
${paper.journal_name ? `Journal: ${paper.journal_name}` : ''}

Generate optimized content for each platform. Include a "hashtags" object with platform-specific hashtag arrays.`;
}

export function buildVideoScriptPrompt(paper: {
  title: string;
  abstract?: string;
  journal_name?: string;
  authors: string[];
}): string {
  return `Write a 60-second narration script for a short video about this research:

Title: ${paper.title}
${paper.abstract ? `Abstract: ${paper.abstract}` : ''}
${paper.journal_name ? `Journal: ${paper.journal_name}` : ''}
Authors: ${paper.authors.slice(0, 3).join(', ')}

Create an engaging narration script with visual cues.`;
}
