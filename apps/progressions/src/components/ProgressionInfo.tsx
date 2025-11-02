import { ProgressionInfo as StyledProgressionInfo } from './StyledComponents';

interface ProgressionInfoProps {
  songs: string[];
  progressionName: string;
}

export function ProgressionInfo({ songs, progressionName }: ProgressionInfoProps) {
  return (
    <StyledProgressionInfo>
      <h4>Songs using this progression:</h4>
      <ul>
        {songs.map((song, index) => (
          <li key={index}>{song}</li>
        ))}
      </ul>
    </StyledProgressionInfo>
  );
}

