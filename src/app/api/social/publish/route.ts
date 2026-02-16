import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { publishContent } from '@/lib/social/publisher';
import type { Content, SocialAccount } from '@/lib/supabase/types';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contentId, accountId } = await request.json();
  if (!contentId || !accountId) {
    return NextResponse.json({ error: 'contentId and accountId required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const [contentRes, accountRes] = await Promise.all([
    admin.from('content').select('*').eq('id', contentId).single(),
    admin.from('social_accounts').select('*').eq('id', accountId).single(),
  ]);

  if (contentRes.error || !contentRes.data) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }
  if (accountRes.error || !accountRes.data) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const result = await publishContent(
    contentRes.data as Content,
    accountRes.data as SocialAccount
  );

  await admin.from('activity_log').insert({
    user_id: user.id,
    action: 'manual_publish',
    entity_type: 'content',
    entity_id: contentId,
    details: result,
  });

  if (result.success) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json(result, { status: 500 });
  }
}
