import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(full_name, avatar_url)')
    .eq('content_id', contentId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contentId, body, parentId } = await request.json();
  if (!contentId || !body?.trim()) {
    return NextResponse.json({ error: 'contentId and body required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: user.id,
      content_id: contentId,
      parent_id: parentId || null,
      body: body.trim(),
    })
    .select('*, profiles(full_name, avatar_url)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
