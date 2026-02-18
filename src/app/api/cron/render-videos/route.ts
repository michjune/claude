import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderVideoForRecord } from '@/lib/video/renderer';

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const jobName = 'render-videos';

  try {
    await supabase
      .from('cron_jobs')
      .upsert({ job_name: jobName, last_run_at: new Date().toISOString(), last_status: 'running' }, { onConflict: 'job_name' });

    // Find approved video scripts without rendered videos
    const { data: scripts } = await supabase
      .from('content')
      .select('id, paper_id, body, metadata')
      .eq('content_type', 'video_script')
      .eq('status', 'approved')
      .limit(3);

    if (!scripts || scripts.length === 0) {
      await supabase
        .from('cron_jobs')
        .update({ last_status: 'success', items_processed: 0, last_error: null })
        .eq('job_name', jobName);
      return NextResponse.json({ success: true, rendered: 0 });
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

    await supabase
      .from('cron_jobs')
      .update({ last_status: 'success', items_processed: rendered, last_error: null })
      .eq('job_name', jobName);

    return NextResponse.json({ success: true, rendered });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('cron_jobs')
      .update({ last_status: 'failed', last_error: message })
      .eq('job_name', jobName);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
