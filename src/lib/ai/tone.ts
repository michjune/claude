import { createAdminClient } from '@/lib/supabase/admin';
import type { AiToneSetting } from '@/lib/supabase/types';

export interface ToneSettings {
  tone: string;
  blog_style: string;
  social_style: string;
  video_style: string;
  preset_name: string;
  preset_id: string;
}

const DEFAULTS: ToneSettings = {
  tone: 'Sharp, curious, confident',
  blog_style: 'Write like Not Boring or NFX essays. Lead with the insight, not the setup. Make complex stem cell research feel like the most interesting thing the reader will encounter today. Short sentences for impact. Longer ones when building toward a revelation. No throat-clearing, no hedging, no "it\'s not X, it\'s Y" constructions. Minimize em-dashes. Sound like a smart friend who happens to know a lot about biology.',
  social_style: 'Naval Ravikant energy: high signal, zero filler. Insight-first, not summary-first. No em-dashes on TikTok or Instagram. Twitter should feel like a quote worth screenshotting. LinkedIn can build a brief argument. Instagram and TikTok should hook in the first line and feel conversational, not scripted.',
  video_style: 'Conversational and confident, like you are telling a friend about something that genuinely blew your mind. Vary sentence length for rhythm. Open with a hook that creates a knowledge gap. Build tension before the payoff. No em-dashes. No filler phrases like "here\'s the thing" or "let\'s dive in."',
  preset_name: 'Default',
  preset_id: 'default',
};

let cachedAllSettings: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAllSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedAllSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedAllSettings;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_tone_settings')
    .select('setting_key, value');

  if (error || !data || data.length === 0) {
    return {};
  }

  const settings: Record<string, string> = {};
  for (const row of data as AiToneSetting[]) {
    settings[row.setting_key] = row.value;
  }

  cachedAllSettings = settings;
  cacheTimestamp = now;

  return settings;
}

/**
 * Get tone settings. If A/B testing is enabled, randomly selects a preset.
 * Returns the selected preset's settings along with its name and ID for tracking.
 */
export async function getToneSettings(): Promise<ToneSettings> {
  const all = await getAllSettings();

  const abEnabled = all['ab_test:enabled'] === 'true';
  const abPresets = all['ab_test:presets']?.split(',').map(s => s.trim()).filter(Boolean) || [];

  if (abEnabled && abPresets.length >= 2) {
    // Random selection
    const selected = abPresets[Math.floor(Math.random() * abPresets.length)];
    return buildPresetSettings(all, selected);
  }

  // No A/B test — use base settings
  return {
    tone: all.tone || DEFAULTS.tone,
    blog_style: all.blog_style || DEFAULTS.blog_style,
    social_style: all.social_style || DEFAULTS.social_style,
    video_style: all.video_style || DEFAULTS.video_style,
    preset_name: 'Default',
    preset_id: 'default',
  };
}

/**
 * Get a specific preset by ID (e.g., 'preset_1').
 */
export async function getPresetSettings(presetId: string): Promise<ToneSettings> {
  const all = await getAllSettings();
  return buildPresetSettings(all, presetId);
}

function buildPresetSettings(all: Record<string, string>, presetId: string): ToneSettings {
  const prefix = `${presetId}:`;
  return {
    tone: all[`${prefix}tone`] || all.tone || DEFAULTS.tone,
    blog_style: all[`${prefix}blog_style`] || all.blog_style || DEFAULTS.blog_style,
    social_style: all[`${prefix}social_style`] || all.social_style || DEFAULTS.social_style,
    video_style: all[`${prefix}video_style`] || all.video_style || DEFAULTS.video_style,
    preset_name: all[`${prefix}name`] || presetId,
    preset_id: presetId,
  };
}

export function buildToneDirective(tone: string, style: string): string {
  return `\n\nTone: ${tone}\nStyle instructions: ${style}\nCritical: Never use "it's not X, it's Y" constructions. Minimize em-dashes. No filler phrases.`;
}

export function clearToneCache(): void {
  cachedAllSettings = null;
  cacheTimestamp = 0;
}
