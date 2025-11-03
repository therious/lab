import {
  ChordDisplay as StyledChordDisplay,
  ChordProgression as StyledChordProgression,
  ChordBox,
  ChordRoman,
  ChordName,
} from './StyledComponents';
import { getChordName, toSuperscript } from '../utils/chordUtils';

interface ChordDisplayProps {
  progressionName: string;
  progression: string[];
  currentKey: string;
  currentChordIndex: number;
  isPlaying: boolean;
}

export function ChordDisplay({ progressionName, progression, currentKey, currentChordIndex, isPlaying }: ChordDisplayProps) {
  return (
    <StyledChordDisplay>
      <h3>Progression: {progressionName}</h3>
      <StyledChordProgression>
        {progression.map((chord, index) => {
          const isActive = index === currentChordIndex && isPlaying;
          return (
            <ChordBox key={index} $active={isActive}>
              <ChordRoman $active={isActive}>{toSuperscript(chord)}</ChordRoman>
              <ChordName $active={isActive}>{toSuperscript(getChordName(chord, currentKey))}</ChordName>
            </ChordBox>
          );
        })}
      </StyledChordProgression>
    </StyledChordDisplay>
  );
}

