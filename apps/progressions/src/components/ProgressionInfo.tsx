import { ProgressionInfo as StyledProgressionInfo, SongListItem } from './StyledComponents';
import { parseSongString, SongInfo } from '../utils/songUtils';

interface ProgressionInfoProps {
  songs: string[];
  progressionName: string;
  selectedSong?: SongInfo | null;
  onSongSelect: (song: SongInfo) => void;
}

export function ProgressionInfo({ songs, progressionName, selectedSong, onSongSelect }: ProgressionInfoProps) {
  const parsedSongs = songs.map(parseSongString);
  
  const handleSongClick = (song: SongInfo) => {
    onSongSelect(song);
  };

  return (
    <StyledProgressionInfo>
      <h4>Songs using this progression:</h4>
      <ul>
        {parsedSongs.map((song, index) => {
          const isSelected = selectedSong && 
            selectedSong.title === song.title && 
            selectedSong.artist === song.artist;
          
          return (
            <SongListItem 
              key={index} 
              $selected={isSelected}
              onClick={() => handleSongClick(song)}
            >
              {song.displayText}
            </SongListItem>
          );
        })}
      </ul>
    </StyledProgressionInfo>
  );
}

