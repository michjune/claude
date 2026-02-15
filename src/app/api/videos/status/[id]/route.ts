import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('videos')
    .select('id, status, progress, voiceover_url, video_url, thumbnail_url, duration_seconds, error_message')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  return NextResponse.json(data);
}
