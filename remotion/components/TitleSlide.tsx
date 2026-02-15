import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface TitleSlideProps {
  title: string;
  journal: string;
}

export const TitleSlide: React.FC<TitleSlideProps> = ({ title, journal }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = spring({ frame, fps, config: { damping: 200, stiffness: 100 } });
  const journalOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          opacity: journalOpacity,
          color: '#22c55e',
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 30,
        }}
      >
        {journal}
      </div>

      <h1
        style={{
          opacity: titleOpacity,
          transform: `translateY(${(1 - titleY) * 40}px)`,
          color: 'white',
          fontSize: 48,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: 900,
        }}
      >
        {title}
      </h1>

      <div
        style={{
          opacity: journalOpacity,
          marginTop: 40,
          width: 80,
          height: 4,
          borderRadius: 2,
          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
        }}
      />
    </div>
  );
};
