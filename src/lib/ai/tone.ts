import { createAdminClient } from '@/lib/supabase/admin';
import type { AiToneSetting } from '@/lib/supabase/types';

interface ToneSettings {
  tone: string;
  blog_style: string;
  social_style: string;
  video_style: string;
}

const DEFAULTS: ToneSettings = {
  tone: 'Professional',
  blog_style: 'Write in a clear, authoritative voice that makes complex stem cell research accessible.',
  social_style: 'Be concise and attention-grabbing. Use platform-appropriate language and hashtags.',
  video_style: 'Use a conversational, enthusiastic tone as if explaining to a curious friend.',
};

let cachedSettings: ToneSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getToneSettings(): Promise<ToneSettings> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ai_tone_settings')
    .select('setting_key, value');

  if (error || !data || data.length === 0) {
    return DEFAULTS;
  }

  const settings: ToneSettings = { ...DEFAULTS };
  for (const row of data as AiToneSetting[]) {
    if (row.setting_key in settings) {
      settings[row.setting_key as keyof ToneSettings] = row.value;
    }
  }

  cachedSettings = settings;
  cacheTimestamp = now;

  return settings;
}

export function buildToneDirective(tone: string, style: string): string {
  return `\n\nTone: ${tone}\nStyle instructions: ${style}`;
}

export function clearToneCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}
