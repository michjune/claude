import { generateStructuredContent } from './anthropic';
import { SYSTEM_PROMPTS, buildVideoScriptPrompt } from './prompts';
import { buildToneDirective } from './tone';
import type { ToneSettings } from './tone';
import { factCheckContent, buildResearchSummary } from './research-pipeline';
import type { ResearchContext } from './research-pipeline';
import type { Paper } from '@/lib/supabase/types';

interface ScriptOutput {
  script: string;
  visual_cues: string[];
  hook: string;
}

/**
 * Generate video script with research-backed accuracy.
 * 1. Generate initial script
 * 2. Fact-check against source + literature
 * 3. Revise if needed
 */
export async function generateVideoScript(
  paper: Paper,
  research: ResearchContext,
  tone: ToneSettings
): Promise<ScriptOutput> {
  const researchSummary = buildResearchSummary(research);

  const userPrompt = buildVideoScriptPrompt({
    title: paper.title,
    abstract: paper.abstract || undefined,
    journal_name: paper.journal_name || undefined,
    authors: paper.authors,
  });

  const systemPrompt = `${SYSTEM_PROMPTS.contentGenerator}\n\n${SYSTEM_PROMPTS.videoScript}${buildToneDirective(tone.tone, tone.video_style)}${researchSummary}`;

  // Step 1: Generate initial script
  console.log('[script-gen] Step 1: Generating initial script...');
  const draft = await generateStructuredContent<ScriptOutput>(
    systemPrompt,
    userPrompt,
    { temperature: 0.7, maxTokens: 2000 }
  );

  // Step 2: Fact-check the script
  console.log('[script-gen] Step 2: Fact-checking script...');
  const factCheck = await factCheckContent(
    draft.script,
    paper.title,
    paper,
    research.literature
  );

  // If no issues, return as-is
  if (factCheck.issues.length === 0 && factCheck.missing_nuances.length === 0) {
    console.log('[script-gen] Fact-check passed, no revisions needed.');
    return draft;
  }

  // Step 3: Revise script with corrections
  console.log(`[script-gen] Step 3: Revising ${factCheck.issues.length} issues...`);
  const revised = await reviseScript(draft, paper, factCheck, researchSummary);

  return revised;
}

async function reviseScript(
  draft: ScriptOutput,
  paper: Paper,
  factCheck: Awaited<ReturnType<typeof factCheckContent>>,
  researchSummary: string
): Promise<ScriptOutput> {
  const issuesList = factCheck.issues.map(i =>
    `- "${i.claim}" [${i.verdict}]: ${i.suggested_fix}`
  ).join('\n');

  const nuancesList = factCheck.missing_nuances.map(n => `- ${n}`).join('\n');

  const systemPrompt = `You are a science video script editor. Fix factual issues in this 60-second narration script while keeping it engaging, punchy, and exactly ~150 words. Maintain visual cue markers in [brackets].
${researchSummary}

Respond with valid JSON: { "script": string, "visual_cues": string[], "hook": string }`;

  const userPrompt = `Revise this video script about "${paper.title}" to fix accuracy issues.

CURRENT SCRIPT:
${draft.script}

VISUAL CUES: ${draft.visual_cues.join(', ')}
HOOK: ${draft.hook}

FACT-CHECK ISSUES TO FIX:
${issuesList}

${nuancesList ? `MISSING NUANCES:\n${nuancesList}` : ''}

Fix these issues while keeping the script engaging and exactly ~150 words (~60 seconds).`;

  return generateStructuredContent<ScriptOutput>(systemPrompt, userPrompt, {
    temperature: 0.7,
    maxTokens: 2000,
  });
}
