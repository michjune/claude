import { createAdminClient } from '@/lib/supabase/admin';
import { renderVideoForRecord } from '@/lib/video/renderer';

export async function renderPendingVideos(): Promise<{ rendered: number }> {
  const supabase = createAdminClient();

  // Find approved video scripts without rendered videos
  const { data: scripts } = await supabase
    .from('content')
    .select('id, paper_id, body, metadata')
    .eq('content_type', 'video_script')
    .eq('status', 'approved')
    .limit(3);

  if (!scripts || scripts.length === 0) {
    return { rendered: 0 };
  }

  let rendered = 0;

  for (const script of scripts) {
    // Check if video already exists for this content
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id')
      .eq('content_id', script.id)
      .in('status', ['pending', 'generating_audio', 'rendering', 'completed'])
      .limit(1)
      .single();

    if (existingVideo) continue;

    // Create video record and render
    const { data: video, error } = await supabase
      .from('videos')
      .insert({
        content_id: script.id,
        paper_id: script.paper_id,
        script: script.body,
        status: 'pending',
        progress: 0,
        metadata: script.metadata || {},
      })
      .select()
      .single();

    if (error) continue;

    try {
      await renderVideoForRecord(video.id);
      rendered++;
    } catch (err) {
      console.error(`Video render failed for ${video.id}:`, err);
    }
  }

  return { rendered };
}
