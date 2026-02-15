import { generateStructuredContent } from './openai';
import { SYSTEM_PROMPTS, buildVideoScriptPrompt } from './prompts';
import type { Paper } from '@/lib/supabase/types';

interface ScriptOutput {
  script: string;
  visual_cues: string[];
  hook: string;
}

export async function generateVideoScript(paper: Paper): Promise<ScriptOutput> {
  const userPrompt = buildVideoScriptPrompt({
    title: paper.title,
    abstract: paper.abstract || undefined,
    journal_name: paper.journal_name || undefined,
    authors: paper.authors,
  });

  return generateStructuredContent<ScriptOutput>(
    `${SYSTEM_PROMPTS.contentGenerator}\n\n${SYSTEM_PROMPTS.videoScript}`,
    userPrompt,
    { temperature: 0.7, maxTokens: 2000 }
  );
}
