import { createAdminClient } from '@/lib/supabase/admin';
import { runResearchPipeline } from '@/lib/ai/research-pipeline';
import { factCheckContent } from '@/lib/ai/research-pipeline';
import type { ResearchContext, FactCheckResult } from '@/lib/ai/research-pipeline';
import { generateInitialDraft, editAndOptimize } from '@/lib/ai/blog-generator';
import { generateSocialContent } from '@/lib/ai/social-generator';
import { generateVideoScript } from '@/lib/ai/script-generator';
import { generateBlogImage } from '@/lib/ai/image-generator';
import { getToneSettings, buildToneDirective } from '@/lib/ai/tone';
import type { ToneSettings } from '@/lib/ai/tone';
import { insertBlogContent, insertSocialContent, insertScriptContent, updateBlogImage } from './content-writer';
import type { PipelineStepName, PipelineStep } from './steps';
import type { Paper } from '@/lib/supabase/types';

/**
 * Execute a single pipeline step. Reads dependency outputs from pipeline_steps,
 * runs the appropriate AI call, stores output_data, and writes to content table
 * when a step produces final content.
 */
export async function executeStep(
  step: PipelineStep,
  paper: Paper,
): Promise<Record<string, unknown>> {
  const executor = EXECUTORS[step.step];
  if (!executor) throw new Error(`Unknown pipeline step: ${step.step}`);
  return executor(step, paper);
}

/** Load output_data from a dependency step. */
async function getDependencyOutput(
  paperId: string,
  stepName: PipelineStepName,
): Promise<Record<string, unknown>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pipeline_steps')
    .select('output_data')
    .eq('paper_id', paperId)
    .eq('step', stepName)
    .eq('status', 'completed')
    .single();

  if (error || !data?.output_data) {
    throw new Error(`Missing dependency output: ${stepName} for paper ${paperId}`);
  }

  return data.output_data as Record<string, unknown>;
}

// ────────────────────────────────────────────
// Step executors
// ────────────────────────────────────────────

interface BlogDraft {
  title: string;
  slug: string;
  body: string;
  summary: string;
  seo_title: string;
  seo_description: string;
  keywords: string[];
}

const EXECUTORS: Record<PipelineStepName, (step: PipelineStep, paper: Paper) => Promise<Record<string, unknown>>> = {
  research: async (_step, paper) => {
    const research = await runResearchPipeline(paper);
    const tone = await getToneSettings();
    return { research, tone };
  },

  blog_draft: async (_step, paper) => {
    const dep = await getDependencyOutput(paper.id, 'research');
    const research = dep.research as ResearchContext;
    const tone = dep.tone as ToneSettings;
    const toneDirective = buildToneDirective(tone.tone, tone.blog_style);
    const draft = await generateInitialDraft(paper, research, toneDirective);
    return { draft };
  },

  blog_factcheck: async (_step, paper) => {
    const researchDep = await getDependencyOutput(paper.id, 'research');
    const research = researchDep.research as ResearchContext;
    const draftDep = await getDependencyOutput(paper.id, 'blog_draft');
    const draft = draftDep.draft as BlogDraft;
    const factCheck = await factCheckContent(draft.body, draft.title, paper, research.literature);
    return { factCheck };
  },

  blog_edit: async (_step, paper) => {
    const researchDep = await getDependencyOutput(paper.id, 'research');
    const research = researchDep.research as ResearchContext;
    const tone = researchDep.tone as ToneSettings;
    const draftDep = await getDependencyOutput(paper.id, 'blog_draft');
    const draft = draftDep.draft as BlogDraft;
    const factcheckDep = await getDependencyOutput(paper.id, 'blog_factcheck');
    const factCheck = factcheckDep.factCheck as FactCheckResult;
    const toneDirective = buildToneDirective(tone.tone, tone.blog_style);
    const final = await editAndOptimize(draft, paper, research, factCheck, toneDirective);

    // Sanitize slug
    final.slug = final.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Write blog to content table
    await insertBlogContent(paper.id, final, tone.preset_id, tone.preset_name);

    return { final };
  },

  social: async (_step, paper) => {
    const dep = await getDependencyOutput(paper.id, 'research');
    const research = dep.research as ResearchContext;
    const tone = dep.tone as ToneSettings;
    const social = await generateSocialContent(paper, research, tone);

    // Write 6 social posts to content table
    await insertSocialContent(
      paper.id,
      {
        tweet: social.tweet,
        linkedin_post: social.linkedin_post,
        instagram_caption: social.instagram_caption,
        facebook_post: social.facebook_post,
        tiktok_caption: social.tiktok_caption,
        youtube_description: social.youtube_description,
        hashtags: social.hashtags as Record<string, string[]> | undefined,
      },
      tone.preset_id,
      tone.preset_name,
    );

    return { social };
  },

  script: async (_step, paper) => {
    const dep = await getDependencyOutput(paper.id, 'research');
    const research = dep.research as ResearchContext;
    const tone = dep.tone as ToneSettings;
    const script = await generateVideoScript(paper, research, tone);

    // Write video_script to content table
    await insertScriptContent(paper.id, script, tone.preset_id, tone.preset_name);

    return { script };
  },

  image: async (_step, paper) => {
    const dep = await getDependencyOutput(paper.id, 'blog_edit');
    const final = dep.final as BlogDraft;

    const imageResult = await generateBlogImage(final.title, final.keywords, final.slug);

    // Update blog content row with og_image_url
    await updateBlogImage(
      paper.id,
      imageResult.og_image_url,
      imageResult.unsplash_author,
      imageResult.unsplash_author_url,
    );

    // Mark paper as content_generated
    const supabase = createAdminClient();
    await supabase
      .from('papers')
      .update({ content_generated: true })
      .eq('id', paper.id);

    return { image: imageResult };
  },
};
