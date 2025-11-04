import { useState, useEffect } from 'react';
import { searchYouTube, YouTubeVideo, getYouTubeSearchUrl, isApiKeyConfigured } from '../services/youtubeService';
import { SongInfo } from '../utils/songUtils';
import {
  YouTubeSearchContainer,
  YouTubeSearchHeader,
  YouTubeVideoList,
  YouTubeVideoItem,
  YouTubeThumbnail,
  YouTubeVideoInfo,
  YouTubeVideoTitle,
  YouTubeVideoChannel,
  YouTubeLoading,
  YouTubeError,
  YouTubeEmpty,
  YouTubeFallbackButton
} from './StyledComponents';

interface YouTubeSearchResultsProps {
  song: SongInfo | null;
  onVideoSelect: (videoId: string) => void;
}

export function YouTubeSearchResults({ song, onVideoSelect }: YouTubeSearchResultsProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!song) {
      setVideos([]);
      setError(null);
      return;
    }

    // If API key is not configured, don't try to search
    if (!isApiKeyConfigured()) {
      setVideos([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Build search query from song title and artist
    const searchQuery = `${song.title} ${song.artist}`.trim();
    
    searchYouTube(searchQuery, 10)
      .then((result) => {
        if (result.error) {
          setError(result.error);
          setVideos([]);
        } else {
          setVideos(result.videos);
          setError(null);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to search YouTube');
        setVideos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [song]);

  if (!song) {
    return null;
  }

  const searchQuery = `${song.title} ${song.artist}`.trim();
  const youtubeSearchUrl = getYouTubeSearchUrl(searchQuery);

  const handleYouTubeSearch = () => {
    window.open(youtubeSearchUrl, '_blank', 'noopener,noreferrer');
  };

  // If API key is not configured, show fallback button
  if (!isApiKeyConfigured()) {
    return (
      <YouTubeSearchContainer>
        <YouTubeSearchHeader>
          <h4>YouTube Videos for "{song.title}" by {song.artist}</h4>
        </YouTubeSearchHeader>
        <YouTubeFallbackButton onClick={handleYouTubeSearch}>
          Search on YouTube
        </YouTubeFallbackButton>
      </YouTubeSearchContainer>
    );
  }

  return (
    <YouTubeSearchContainer>
      <YouTubeSearchHeader>
        <h4>YouTube Videos for "{song.title}" by {song.artist}</h4>
      </YouTubeSearchHeader>
      
      {loading && (
        <YouTubeLoading>Searching YouTube...</YouTubeLoading>
      )}
      
      {error && (
        <YouTubeError>
          <p>{error}</p>
          <YouTubeFallbackButton
            onClick={handleYouTubeSearch}
            style={{ marginTop: '12px' }}
          >
            Search on YouTube instead
          </YouTubeFallbackButton>
        </YouTubeError>
      )}
      
      {!loading && !error && videos.length === 0 && (
        <YouTubeEmpty>
          <p>No videos found</p>
          <YouTubeFallbackButton
            onClick={handleYouTubeSearch}
            style={{ marginTop: '12px' }}
          >
            Search on YouTube
          </YouTubeFallbackButton>
        </YouTubeEmpty>
      )}
      
      {!loading && !error && videos.length > 0 && (
        <YouTubeVideoList>
          {videos.map((video) => (
            <YouTubeVideoItem
              key={video.id}
              onClick={() => onVideoSelect(video.id)}
            >
              <YouTubeThumbnail src={video.thumbnail} alt={video.title} />
              <YouTubeVideoInfo>
                <YouTubeVideoTitle>{video.title}</YouTubeVideoTitle>
                <YouTubeVideoChannel>{video.channelTitle}</YouTubeVideoChannel>
              </YouTubeVideoInfo>
            </YouTubeVideoItem>
          ))}
        </YouTubeVideoList>
      )}
    </YouTubeSearchContainer>
  );
}

