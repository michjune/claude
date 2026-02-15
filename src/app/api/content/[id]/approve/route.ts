import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
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
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If it's a blog post, publish immediately (set published_at)
  if (data.content_type === 'blog_post' && !scheduled_at) {
    await admin
      .from('content')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', params.id);
  }

  await admin.from('activity_log').insert({
    user_id: user.id,
    action: 'approve_content',
    entity_type: 'content',
    entity_id: params.id,
    details: { content_type: data.content_type, scheduled_at },
  });

  return NextResponse.json({ success: true });
}
