import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getNextPublishSlot, platformForContentType } from '@/lib/social/schedule';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { scheduled_at } = await request.json().catch(() => ({ scheduled_at: null }));

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {
    status: 'approved',
    approved_by: user.id,
  };

  if (scheduled_at) {
    updateData.scheduled_at = scheduled_at;
  }

  const { data, error } = await admin
    .from('content')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const SOCIAL_TYPES = ['tweet', 'linkedin_post', 'instagram_caption', 'facebook_post', 'tiktok_caption', 'youtube_description'];

  // Blog posts publish immediately, social content gets auto-scheduled
  if (data.content_type === 'blog_post' && !scheduled_at) {
    await admin
      .from('content')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', id);
  } else if (SOCIAL_TYPES.includes(data.content_type) && !scheduled_at) {
    // Auto-schedule at the next optimal time slot
    const platform = platformForContentType(data.content_type);
    if (platform) {
      const optimalSlot = await getNextPublishSlot(platform, admin);
      await admin
        .from('content')
        .update({ scheduled_at: optimalSlot.toISOString() })
        .eq('id', id);
      updateData.scheduled_at = optimalSlot.toISOString();
    }
  }

  await admin.from('activity_log').insert({
    user_id: user.id,
    action: 'approve_content',
    entity_type: 'content',
    entity_id: id,
    details: {
      content_type: data.content_type,
      scheduled_at: updateData.scheduled_at ?? scheduled_at ?? null,
      auto_scheduled: !scheduled_at && SOCIAL_TYPES.includes(data.content_type),
    },
  });

  return NextResponse.json({ success: true });
}
