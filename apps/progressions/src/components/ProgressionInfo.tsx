import { ProgressionInfo as StyledProgressionInfo, SongListItem } from './StyledComponents';
import { parseSongString, SongInfo } from '../utils/songUtils';
import { sortSongsByArtist } from '../utils/artistIndex';
import { HighlightText } from '../utils/highlightText';

interface ProgressionInfoProps {
  songs: string[];
  progressionName: string;
  selectedSong?: SongInfo | null;
  onSongSelect: (song: SongInfo) => void;
  artistQuery?: string;
}

export function ProgressionInfo({ songs, progressionName, selectedSong, onSongSelect, artistQuery }: ProgressionInfoProps) {
  // Sort songs to put matching artist songs first if artistQuery exists and is not empty
  const sortedSongs = artistQuery?.trim() ? sortSongsByArtist(songs, artistQuery) : songs;
  const parsedSongs = sortedSongs.map(parseSongString);
  
  const handleSongClick = (song: SongInfo) => {
    onSongSelect(song);
  };

  return (
    <StyledProgressionInfo>
      <h4>Songs using this progression:</h4>
      <ul>
        {parsedSongs.map((song, index) => {
          const isSelected = !!(selectedSong && 
            selectedSong.title === song.title && 
            selectedSong.artist === song.artist);
          
          return (
            <SongListItem 
              key={index} 
              $selected={isSelected}
              onClick={() => handleSongClick(song)}
            >
              <HighlightText text={song.displayText} searchTerm={artistQuery?.trim() || ''} />
            </SongListItem>
          );
        })}
      </ul>
    </StyledProgressionInfo>
  );
}

