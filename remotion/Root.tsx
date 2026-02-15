import { Composition } from 'remotion';
import { ResearchHighlight } from './compositions/ResearchHighlight';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ResearchHighlight"
        component={ResearchHighlight}
        durationInFrames={1800} // 60 seconds at 30fps
        fps={30}
        width={1080}
        height={1920} // 9:16 vertical for shorts/reels
        defaultProps={{
          script: 'Sample research highlight script...',
          voiceoverUrl: '',
          visualCues: ['Title card', 'Research graphic', 'Key finding', 'Conclusion'],
          title: 'Breakthrough in Stem Cell Research',
          journal: 'Nature',
        }}
      />
    </>
  );
};
