import { generateStructuredContent } from './anthropic';
import { SYSTEM_PROMPTS, buildBlogPrompt } from './prompts';
import { buildToneDirective } from './tone';
import type { ToneSettings } from './tone';
import { factCheckContent } from './research-pipeline';
import type { ResearchContext } from './research-pipeline';
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

/**
 * Multi-pass blog generation pipeline:
 * 1. Generate initial draft
 * 2. Fact-check draft against source paper + literature
 * 3. Edit/optimize with footnotes and references
 */
export async function generateBlogPost(
  paper: Paper,
  research: ResearchContext,
  tone: ToneSettings
): Promise<BlogOutput> {
  const toneDirective = buildToneDirective(tone.tone, tone.blog_style);

  // Step 1: Generate initial draft
  console.log('[blog-gen] Step 1: Generating initial draft...');
  const draft = await generateInitialDraft(paper, research, toneDirective);

  // Step 2: Fact-check draft against source + literature
  console.log('[blog-gen] Step 2: Fact-checking draft...');
  const factCheck = await factCheckContent(
    draft.body,
    draft.title,
    paper,
    research.literature
  );
  console.log(`[blog-gen] Fact-check: ${factCheck.overall_accuracy} accuracy, ${factCheck.issues.length} issues`);

  // Step 3: Edit/optimize with references and corrections
  console.log('[blog-gen] Step 3: Editing and optimizing with references...');
  const final = await editAndOptimize(draft, paper, research, factCheck, toneDirective);

  // Sanitize slug
  final.slug = final.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return final;
}

export async function generateInitialDraft(
  paper: Paper,
  research: ResearchContext,
  toneDirective: string
): Promise<BlogOutput> {
  const userPrompt = buildBlogPrompt({
    title: paper.title,
    abstract: paper.abstract || undefined,
    authors: paper.authors,
    journal_name: paper.journal_name || undefined,
    published_date: paper.published_date || undefined,
    keywords: paper.keywords,
  });

  const { literature } = research;
  const contextBlock = literature.references.length > 0
    ? `\n\nRelated literature context:\n${literature.key_context}\nCorroborating: ${literature.corroborating_findings.join('; ')}\nContrasting: ${literature.contrasting_findings.join('; ')}`
    : '';

  const systemPrompt = `${SYSTEM_PROMPTS.contentGenerator}\n\n${SYSTEM_PROMPTS.blogPost}${toneDirective}${contextBlock}`;

  return generateStructuredContent<BlogOutput>(systemPrompt, userPrompt, {
    temperature: 0.7,
    maxTokens: 4096,
  });
}

export async function editAndOptimize(
  draft: BlogOutput,
  paper: Paper,
  research: ResearchContext,
  factCheck: Awaited<ReturnType<typeof factCheckContent>>,
  toneDirective: string
): Promise<BlogOutput> {
  const { literature } = research;

  const issuesList = factCheck.issues.length > 0
    ? `\n\nFACT-CHECK ISSUES TO FIX:\n${factCheck.issues.map(i => `- "${i.claim}" [${i.verdict}]: ${i.explanation}\n  Fix: ${i.suggested_fix}`).join('\n')}`
    : '\n\nFact-check: No issues found. Draft is accurate.';

  const nuancesList = factCheck.missing_nuances.length > 0
    ? `\n\nMISSING NUANCES TO ADD:\n${factCheck.missing_nuances.map(n => `- ${n}`).join('\n')}`
    : '';

  const refsFormatted = literature.references.length > 0
    ? `\n\nAVAILABLE REFERENCES TO CITE (use numbered footnotes in the text, e.g. [1], [2]):\n${literature.references.map(r => `[${r.id}] ${r.authors} "${r.title}" *${r.journal}* (${r.year})${r.doi ? ` doi:${r.doi}` : ''} — ${r.relevance}`).join('\n')}`
    : '';

  const systemPrompt = `You are an expert science editor who writes like the best of LITFL (Life In The Fast Lane), Deranged Physiology, and Not Boring essays. Your editing style:

1. **Clarity over jargon**: Explain technical concepts as if your smartest non-specialist friend asked you about it at dinner. Use analogies. Be vivid.
2. **Intellectual honesty**: Never overstate findings. Qualify claims appropriately. Show what we know, what we think, and what we're still figuring out.
3. **Footnotes as texture**: Use numbered footnotes [1] to cite references, but also use them for witty asides, deeper context, or "for the nerds" detail — like Deranged Physiology does.
4. **Narrative pull**: Structure the piece so readers WANT to keep reading. Open with a hook that creates genuine curiosity. Build tension. Payoff at the end.
5. **References section**: End with a numbered references list. Include the source paper as [1] always. Format: Author(s). "Title." *Journal* (Year). doi:xxx

You must fix all fact-check issues and incorporate missing nuances. The final piece should be 1000-1500 words, deeply credible, and genuinely interesting to read.

${toneDirective}

Respond with valid JSON: { "title": string, "slug": string, "body": string (markdown with footnotes), "summary": string (2-3 sentences), "seo_title": string (max 60 chars), "seo_description": string (max 160 chars), "keywords": string[] }`;

  const userPrompt = `Here is a draft blog post that needs editing and optimization.

DRAFT:
Title: ${draft.title}
Slug: ${draft.slug}

${draft.body}

SEO Title: ${draft.seo_title}
SEO Description: ${draft.seo_description}
Summary: ${draft.summary}
Keywords: ${draft.keywords.join(', ')}
${issuesList}${nuancesList}${refsFormatted}

SOURCE PAPER (always cite as reference [1]):
${research.sourcePaperRef}

BROADER CONTEXT FROM LITERATURE:
${literature.broader_context || 'No additional context available.'}
${literature.corroborating_findings.length > 0 ? `\nCorroborating: ${literature.corroborating_findings.join('; ')}` : ''}
${literature.contrasting_findings.length > 0 ? `\nContrasting: ${literature.contrasting_findings.join('; ')}` : ''}

Please edit and optimize this draft into a final piece. Fix all fact-check issues, weave in references naturally with numbered footnotes, add missing nuances, and make it read like the best of LITFL/Not Boring. The piece should be deeply credible and genuinely fun to read.`;

  return generateStructuredContent<BlogOutput>(systemPrompt, userPrompt, {
    temperature: 0.7,
    maxTokens: 6000,
  });
}
