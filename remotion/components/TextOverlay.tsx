import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface TextOverlayProps {
  text: string;
  label: string;
  index: number;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ text, label, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({ frame, fps, config: { damping: 200, stiffness: 80 } });
  const textOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' });

  const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];
  const accentColor = colors[index % colors.length];

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
      {/* Section label */}
      <div
        style={{
          opacity: enterProgress,
          transform: `translateX(${(1 - enterProgress) * -30}px)`,
          color: accentColor,
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 30,
          alignSelf: 'flex-start',
        }}
      >
        {label}
      </div>

      {/* Accent line */}
      <div
        style={{
          width: `${enterProgress * 100}%`,
          height: 2,
          background: accentColor,
          marginBottom: 40,
          alignSelf: 'flex-start',
        }}
      />

      {/* Main text */}
      <p
        style={{
          opacity: textOpacity,
          color: 'white',
          fontSize: 36,
          fontWeight: 400,
          lineHeight: 1.6,
          textAlign: 'left',
          maxWidth: 900,
        }}
      >
        {text}
      </p>
    </div>
  );
};
