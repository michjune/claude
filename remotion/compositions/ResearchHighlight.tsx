import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { TitleSlide } from '../components/TitleSlide';
import { TextOverlay } from '../components/TextOverlay';
import { ProgressBar } from '../components/ProgressBar';

interface ResearchHighlightProps {
  script: string;
  voiceoverUrl: string;
  visualCues: string[];
  title: string;
  journal: string;
}

export const ResearchHighlight: React.FC<ResearchHighlightProps> = ({
  script,
  voiceoverUrl,
  visualCues,
  title,
  journal,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Split script into sections based on visual cues
  const sentences = script.split(/[.!?]+/).filter(Boolean);
  const sectionLength = Math.floor(durationInFrames / Math.max(visualCues.length, 1));

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a3a2a 50%, #0a0a0a 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Background gradient animation */}
      <AbsoluteFill
        style={{
          opacity: 0.3,
          background: `radial-gradient(circle at ${50 + Math.sin(frame / 60) * 20}% ${50 + Math.cos(frame / 80) * 20}%, rgba(34, 197, 94, 0.3) 0%, transparent 60%)`,
        }}
      />

      {/* Title slide - first 4 seconds */}
      <Sequence from={0} durationInFrames={fps * 4}>
        <TitleSlide title={title} journal={journal} />
      </Sequence>

      {/* Content sections */}
      {visualCues.map((cue, i) => {
        const startFrame = fps * 4 + i * sectionLength;
        const sectionSentences = sentences.slice(
          Math.floor((i / visualCues.length) * sentences.length),
          Math.floor(((i + 1) / visualCues.length) * sentences.length)
        );

        return (
          <Sequence key={i} from={startFrame} durationInFrames={sectionLength}>
            <TextOverlay
              text={sectionSentences.join('. ').trim() + '.'}
              label={cue}
              index={i}
            />
          </Sequence>
        );
      })}

      {/* Progress bar */}
      <ProgressBar progress={frame / durationInFrames} />

      {/* Voiceover audio */}
      {voiceoverUrl && (
        <Audio src={voiceoverUrl} />
      )}

      {/* Branding */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 18,
          letterSpacing: 2,
        }}
      >
        STEMCELL PULSE
      </div>
    </AbsoluteFill>
  );
};
