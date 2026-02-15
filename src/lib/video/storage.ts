import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET_NAME = 'media';

export async function ensureBucket(): Promise<void> {
  const supabase = createAdminClient();
  const { data: buckets } = await supabase.storage.listBuckets();

  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm', 'image/png', 'image/jpeg'],
    });
  }
}

export async function uploadFile(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const supabase = createAdminClient();

  await ensureBucket();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, data, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export async function uploadVoiceover(videoId: string, audioData: Buffer): Promise<string> {
  return uploadFile(`voiceovers/${videoId}.mp3`, audioData, 'audio/mpeg');
}

export async function uploadVideo(videoId: string, videoData: Buffer): Promise<string> {
  return uploadFile(`videos/${videoId}.mp4`, videoData, 'video/mp4');
}

export async function uploadThumbnail(videoId: string, imageData: Buffer): Promise<string> {
  return uploadFile(`thumbnails/${videoId}.png`, imageData, 'image/png');
}

export async function deleteFile(path: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.from(BUCKET_NAME).remove([path]);
}
