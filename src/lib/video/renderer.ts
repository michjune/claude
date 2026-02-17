import { createAdminClient } from '@/lib/supabase/admin';
import { generateVoiceover } from './elevenlabs';
import { uploadVoiceover, uploadVideo } from './storage';
import type { Video } from '@/lib/supabase/types';

export async function renderVideoForRecord(videoId: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Update status to generating_audio
    await supabase
      .from('videos')
      .update({ status: 'generating_audio', progress: 10 })
      .eq('id', videoId);

    // Get the video record
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !video) throw new Error('Video record not found');

    // Step 1: Generate voiceover
    const audioBuffer = await generateVoiceover(video.script);
    const voiceoverUrl = await uploadVoiceover(videoId, audioBuffer);

    await supabase
      .from('videos')
      .update({
        voiceover_url: voiceoverUrl,
        status: 'rendering',
        progress: 40,
      })
      .eq('id', videoId);

    // Step 2: Render video with Remotion
    // In production, this would call Remotion Lambda or a render service.
    // For now, we'll create a placeholder that can be replaced with actual Remotion rendering.
    const videoUrl = await renderWithRemotion(video as Video, voiceoverUrl);

    // Step 3: Calculate approximate duration from script word count
    const wordCount = video.script.split(/\s+/).length;
    const durationSeconds = Math.round(wordCount / 2.5); // ~150 words per minute

    await supabase
      .from('videos')
      .update({
        video_url: videoUrl,
        duration_seconds: durationSeconds,
        status: 'completed',
        progress: 100,
      })
      .eq('id', videoId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('videos')
      .update({
        status: 'failed',
        error_message: message,
        progress: 0,
      })
      .eq('id', videoId);
    throw error;
  }
}

async function renderWithRemotion(
  video: Video,
  voiceoverUrl: string
): Promise<string> {
  const inputProps = {
    script: video.script,
    voiceoverUrl,
    visualCues: (video.metadata as { visual_cues?: string[] })?.visual_cues || [],
  };

  // Use Remotion Lambda if configured
  if (process.env.REMOTION_FUNCTION_NAME && process.env.REMOTION_SERVE_URL) {
    const { renderOnLambda } = await import('./lambda');
    const result = await renderOnLambda({
      composition: 'ResearchHighlight',
      inputProps,
    });
    return result.outputUrl;
  }

  // Development fallback: return voiceover URL as video placeholder
  console.warn('Remotion Lambda not configured - using voiceover as video placeholder');
  return voiceoverUrl;
}
