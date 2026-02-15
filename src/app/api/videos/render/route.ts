import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderVideoForRecord } from '@/lib/video/renderer';

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contentId, paperId } = await request.json();

  const admin = createAdminClient();

  // Get the video script content
  let script: string;
  let linkedContentId = contentId;
  let linkedPaperId = paperId;

  if (contentId) {
    const { data: content } = await admin
      .from('content')
      .select('*')
      .eq('id', contentId)
      .eq('content_type', 'video_script')
      .single();

    if (!content) return NextResponse.json({ error: 'Video script not found' }, { status: 404 });
    script = content.body;
    linkedPaperId = content.paper_id;
  } else if (paperId) {
    const { data: content } = await admin
      .from('content')
      .select('*')
      .eq('paper_id', paperId)
      .eq('content_type', 'video_script')
      .single();

    if (!content) return NextResponse.json({ error: 'No video script for this paper' }, { status: 404 });
    script = content.body;
    linkedContentId = content.id;
  } else {
    return NextResponse.json({ error: 'contentId or paperId required' }, { status: 400 });
  }

  // Create video record
  const { data: video, error } = await admin
    .from('videos')
    .insert({
      content_id: linkedContentId,
      paper_id: linkedPaperId,
      script,
      status: 'pending',
      progress: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Start rendering in background (fire and forget)
  renderVideoForRecord(video.id).catch((err) =>
    console.error('Video render failed:', err)
  );

  return NextResponse.json({ videoId: video.id, status: 'pending' });
}
