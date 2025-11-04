import { YouTubeVideoEmbed } from './StyledComponents';
import { getYouTubeEmbedUrl } from '../services/youtubeService';

interface YouTubeVideoPlayerProps {
  videoId: string | null;
  songTitle?: string;
}

export function YouTubeVideoPlayer({ videoId, songTitle }: YouTubeVideoPlayerProps) {
  if (!videoId) {
    return null;
  }

  const embedUrl = getYouTubeEmbedUrl(videoId);

  return (
    <YouTubeVideoEmbed>
      <h4>{songTitle ? `Playing: ${songTitle}` : 'YouTube Video'}</h4>
      <iframe
        width="100%"
        height="400"
        src={embedUrl}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </YouTubeVideoEmbed>
  );
}

