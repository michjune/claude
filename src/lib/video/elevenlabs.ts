const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

export async function generateVoiceover(
  text: string,
  voiceId?: string
): Promise<Buffer> {
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah

  const res = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${vid}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${error}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const res = await fetch(`${ELEVENLABS_API}/voices`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
  });

  if (!res.ok) throw new Error(`ElevenLabs voices fetch failed: ${res.status}`);
  const data = await res.json();
  return data.voices.map((v: { voice_id: string; name: string }) => ({
    voice_id: v.voice_id,
    name: v.name,
  }));
}
