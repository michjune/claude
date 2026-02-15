-- AI Tone Settings table
CREATE TABLE IF NOT EXISTS ai_tone_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only admins can read/write
ALTER TABLE ai_tone_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tone settings" ON ai_tone_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed default settings
INSERT INTO ai_tone_settings (setting_key, value) VALUES
  ('tone', 'Professional'),
  ('blog_style', 'Write in a clear, authoritative voice that makes complex stem cell research accessible. Use an engaging narrative style with proper scientific attribution.'),
  ('social_style', 'Be concise and attention-grabbing. Use platform-appropriate language and hashtags. Make science exciting without sensationalizing.'),
  ('video_style', 'Use a conversational, enthusiastic tone as if explaining to a curious friend. Keep energy high and pacing tight for short-form video.')
ON CONFLICT (setting_key) DO NOTHING;
