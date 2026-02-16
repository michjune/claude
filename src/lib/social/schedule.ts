import { SupabaseClient } from '@supabase/supabase-js';
import type { Platform } from '@/lib/supabase/types';

const CONTENT_TYPE_TO_PLATFORM: Record<string, Platform> = {
  tweet: 'twitter',
  linkedin_post: 'linkedin',
  instagram_caption: 'instagram',
  facebook_post: 'facebook',
  tiktok_caption: 'tiktok',
  youtube_description: 'youtube',
};

const DEFAULT_BEST_TIMES: Record<Platform, string[]> = {
  twitter: ['13:00', '17:00'],
  linkedin: ['12:00', '15:00'],
  instagram: ['14:00', '19:00'],
  facebook: ['13:00', '16:00'],
  tiktok: ['19:00', '21:00'],
  youtube: ['15:00', '18:00'],
};

const MIN_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours

export function platformForContentType(contentType: string): Platform | null {
  return CONTENT_TYPE_TO_PLATFORM[contentType] ?? null;
}

/**
 * Find the next available publish slot for a platform based on best_times,
 * daily limits, and minimum spacing between posts.
 */
export async function getNextPublishSlot(
  platform: Platform,
  supabase: SupabaseClient
): Promise<Date> {
  // 1. Get best_times from platform_settings, fall back to defaults
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('best_times, max_posts_per_day')
    .eq('platform', platform)
    .eq('is_active', true)
    .limit(1)
    .single();

  const bestTimes =
    settings?.best_times && settings.best_times.length > 0
      ? settings.best_times
      : DEFAULT_BEST_TIMES[platform];

  const maxPerDay = settings?.max_posts_per_day ?? 3;

  // 2. Build candidate slots for today + tomorrow
  const now = new Date();
  const candidates = buildCandidateSlots(bestTimes, now, 2);

  // 3. Get existing scheduled content for this platform (next 48h)
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const { data: scheduledContent } = await supabase
    .from('content')
    .select('scheduled_at')
    .eq('status', 'approved')
    .in('content_type', contentTypesForPlatform(platform))
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', windowEnd.toISOString());

  const scheduledTimes = (scheduledContent ?? [])
    .map((c: { scheduled_at: string }) => new Date(c.scheduled_at).getTime());

  // 4. Check each candidate
  for (const candidate of candidates) {
    const dayStr = candidate.toISOString().split('T')[0];

    // Check max_posts_per_day (published + scheduled for that day)
    const { count: publishedCount } = await supabase
      .from('social_posts')
      .select('id', { count: 'exact', head: true })
      .eq('platform', platform)
      .eq('status', 'published')
      .gte('published_at', `${dayStr}T00:00:00Z`)
      .lt('published_at', `${dayStr}T23:59:59Z`);

    const scheduledForDay = scheduledTimes.filter((t: number) => {
      const d = new Date(t).toISOString().split('T')[0];
      return d === dayStr;
    }).length;

    if ((publishedCount ?? 0) + scheduledForDay >= maxPerDay) continue;

    // Check 2-hour minimum gap from other scheduled/published posts
    const tooClose = scheduledTimes.some(
      (t: number) => Math.abs(candidate.getTime() - t) < MIN_GAP_MS
    );
    if (tooClose) continue;

    // Also check published posts for gap
    const { count: nearbyCount } = await supabase
      .from('social_posts')
      .select('id', { count: 'exact', head: true })
      .eq('platform', platform)
      .eq('status', 'published')
      .gte('published_at', new Date(candidate.getTime() - MIN_GAP_MS).toISOString())
      .lte('published_at', new Date(candidate.getTime() + MIN_GAP_MS).toISOString());

    if ((nearbyCount ?? 0) > 0) continue;

    return candidate;
  }

  // Fallback: schedule for 2 hours from now if no slot found
  return new Date(now.getTime() + MIN_GAP_MS);
}

function buildCandidateSlots(
  bestTimes: string[],
  from: Date,
  days: number
): Date[] {
  const candidates: Date[] = [];
  const now = from.getTime();

  for (let d = 0; d < days; d++) {
    const dayBase = new Date(from);
    dayBase.setUTCDate(dayBase.getUTCDate() + d);

    for (const time of bestTimes) {
      const [hours, minutes] = time.split(':').map(Number);
      const slot = new Date(dayBase);
      slot.setUTCHours(hours, minutes, 0, 0);

      // Only include future slots (at least 5 min from now)
      if (slot.getTime() > now + 5 * 60 * 1000) {
        candidates.push(slot);
      }
    }
  }

  return candidates.sort((a, b) => a.getTime() - b.getTime());
}

function contentTypesForPlatform(platform: Platform): string[] {
  return Object.entries(CONTENT_TYPE_TO_PLATFORM)
    .filter(([, p]) => p === platform)
    .map(([ct]) => ct);
}
