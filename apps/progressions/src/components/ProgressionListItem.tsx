import { ChordProgression } from '../types';
import {
  ProgressionItem,
  ProgressionName,
  ProgressionChords,
  ChordBadge,
  ProgressionKey,
  ProgressionSongs,
} from './StyledComponents';

interface ProgressionListItemProps {
  progression: ChordProgression;
  isSelected: boolean;
  onClick: () => void;
}

export function ProgressionListItem({ progression, isSelected, onClick }: ProgressionListItemProps) {
  return (
    <ProgressionItem $selected={isSelected} onClick={onClick}>
      <ProgressionName>{progression.name}</ProgressionName>
      <ProgressionChords>
        {progression.progression.map((chord, i) => (
          <ChordBadge key={i}>{chord}</ChordBadge>
        ))}
      </ProgressionChords>
      <ProgressionKey>Key: {progression.key}</ProgressionKey>
      <ProgressionSongs>{progression.songs[0]}</ProgressionSongs>
    </ProgressionItem>
  );
}

