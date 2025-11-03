import { useState, useRef, useEffect } from 'react';
import { ChordProgression } from '../types';
import {
  ProgressionItem,
  ProgressionName,
  ProgressionChords,
  ChordBadge,
  ProgressionKey,
  ProgressionSongsContainer,
  ExpandToggle,
} from './StyledComponents';
import { toSuperscript } from '../utils/chordUtils';

interface ProgressionListItemProps {
  progression: ChordProgression;
  isSelected: boolean;
  onClick: () => void;
}

export function ProgressionListItem({ progression, isSelected, onClick }: ProgressionListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpandControl, setNeedsExpandControl] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const songsText = progression.songs.join(', ');
  
  useEffect(() => {
    // Check if content exceeds 2 lines when collapsed
    if (containerRef.current) {
      const element = containerRef.current;
      // When expanded, we know it needs control if it was already detected
      // When collapsed, measure if it exceeds 2 lines
      if (!isExpanded) {
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 18.2; // 13px * 1.4
        const maxHeight = lineHeight * 2;
        const needsControl = element.scrollHeight > maxHeight + 1; // Small buffer for rounding
        setNeedsExpandControl(needsControl);
      }
      // If already expanded and we previously detected it needs control, keep showing the control
    }
  }, [songsText, isExpanded]);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the item click
    setIsExpanded(!isExpanded);
  };

  return (
    <ProgressionItem $selected={isSelected} onClick={onClick}>
      <ProgressionName>{progression.name}</ProgressionName>
      <ProgressionChords>
        {progression.progression.map((chord, i) => (
          <ChordBadge key={i}>{toSuperscript(chord)}</ChordBadge>
        ))}
      </ProgressionChords>
      <ProgressionKey>Key: {progression.key}</ProgressionKey>
      <div>
        <ProgressionSongsContainer ref={containerRef} $expanded={isExpanded}>
          {songsText}
        </ProgressionSongsContainer>
        {needsExpandControl && (
          <ExpandToggle onClick={handleToggle}>
            {isExpanded ? 'Show less' : 'Show more'}
          </ExpandToggle>
        )}
      </div>
    </ProgressionItem>
  );
}

