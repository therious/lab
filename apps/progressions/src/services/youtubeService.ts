// YouTube Data API v3 service
// Note: You'll need to get a YouTube Data API v3 key from Google Cloud Console
// and set it as an environment variable or in a config file

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export interface YouTubeSearchResponse {
  videos: YouTubeVideo[];
  error?: string;
}

export async function searchYouTube(query: string, maxResults: number = 10): Promise<YouTubeSearchResponse> {
  if (!YOUTUBE_API_KEY) {
    return {
      videos: [],
      error: 'YouTube API key not configured. Please set VITE_YOUTUBE_API_KEY environment variable.'
    };
  }

  try {
    const searchQuery = encodeURIComponent(query);
    const url = `${YOUTUBE_API_URL}?part=snippet&q=${searchQuery}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        videos: [],
        error: errorData.error?.message || `YouTube API error: ${response.status}`
      };
    }
    
    const data = await response.json();
    
    const videos: YouTubeVideo[] = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt
    }));
    
    return { videos };
  } catch (error) {
    return {
      videos: [],
      error: error instanceof Error ? error.message : 'Failed to search YouTube'
    };
  }
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
}

export function getYouTubeSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.youtube.com/results?search_query=${encodedQuery}`;
}

export function isApiKeyConfigured(): boolean {
  return !!YOUTUBE_API_KEY;
}

