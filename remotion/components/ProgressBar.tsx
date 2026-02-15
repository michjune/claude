interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: 'rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  );
};
