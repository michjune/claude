import { generateStructuredContent } from './anthropic';
import { SYSTEM_PROMPTS, buildVideoScriptPrompt } from './prompts';
import { getToneSettings, buildToneDirective } from './tone';
import type { Paper } from '@/lib/supabase/types';

interface ScriptOutput {
  script: string;
  visual_cues: string[];
  hook: string;
}

export async function generateVideoScript(paper: Paper): Promise<ScriptOutput> {
  const tone = await getToneSettings();

  const userPrompt = buildVideoScriptPrompt({
    title: paper.title,
    abstract: paper.abstract || undefined,
    journal_name: paper.journal_name || undefined,
    authors: paper.authors,
  });

  const systemPrompt = `${SYSTEM_PROMPTS.contentGenerator}\n\n${SYSTEM_PROMPTS.videoScript}${buildToneDirective(tone.tone, tone.video_style)}`;

  return generateStructuredContent<ScriptOutput>(
    systemPrompt,
    userPrompt,
    { temperature: 0.7, maxTokens: 2000 }
  );
}
