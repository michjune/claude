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
  // In production, this would use @remotion/lambda or a render API.
  // The Remotion composition expects these input props:
  // - script: string
  // - voiceoverUrl: string
  // - visualCues: string[]
  //
  // For local development / Vercel deployment, you would use:
  // 1. Remotion Lambda: renderMediaOnLambda()
  // 2. Or a separate render server
  //
  // Placeholder: In development, we store the voiceover URL as the video
  // since actual Remotion rendering requires infrastructure setup.

  if (process.env.REMOTION_RENDER_URL) {
    const res = await fetch(process.env.REMOTION_RENDER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        composition: 'ResearchHighlight',
        inputProps: {
          script: video.script,
          voiceoverUrl,
          visualCues: (video.metadata as { visual_cues?: string[] })?.visual_cues || [],
        },
      }),
    });

    if (!res.ok) throw new Error(`Remotion render failed: ${res.status}`);
    const data = await res.json();
    return data.outputUrl;
  }

  // Development fallback: return voiceover URL as video placeholder
  console.warn('REMOTION_RENDER_URL not set - using voiceover as video placeholder');
  return voiceoverUrl;
}
