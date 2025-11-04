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
import { HighlightText } from '../utils/highlightText';
import { sortSongsByArtist } from '../utils/artistIndex';

interface ProgressionListItemProps {
  progression: ChordProgression;
  isSelected: boolean;
  onClick: () => void;
  searchQuery: string;
  artistQuery?: string;
}

export function ProgressionListItem({ progression, isSelected, onClick, searchQuery, artistQuery }: ProgressionListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpandControl, setNeedsExpandControl] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Sort songs to put matching artist songs first if artistQuery exists and is not empty
  const sortedSongs = artistQuery?.trim() ? sortSongsByArtist(progression.songs, artistQuery) : progression.songs;
  const songsText = sortedSongs.join(', ');
  
  // Combine searchQuery and artistQuery for highlighting (artistQuery takes precedence for highlighting)
  const highlightTerm = artistQuery?.trim() || searchQuery?.trim() || '';
  
  // Check if search query or artist query matches songs text and if matches would be hidden when collapsed
  useEffect(() => {
    const queryToCheck = highlightTerm || searchQuery;
    if (queryToCheck.trim() && containerRef.current && !isExpanded) {
      // Check if search matches are in the songs text
      const searchLower = queryToCheck.toLowerCase();
      const songsLower = songsText.toLowerCase();
      const hasMatch = songsLower.includes(searchLower);
      
      if (hasMatch) {
        // Wait for React to render the highlighted marks, then check positions
        // Use double requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const element = containerRef.current;
            if (!element || isExpanded) return;
            
            const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 18.2;
            const maxHeight = lineHeight * 2;
            
            // Temporarily collapse to measure
            const tempStyle = element.style.cssText;
            element.style.maxHeight = `${maxHeight}px`;
            element.style.display = '-webkit-box';
            element.style.webkitBoxOrient = 'vertical';
            element.style.webkitLineClamp = '2';
            
            // Force a reflow
            void element.offsetHeight;
            
            // Check if any mark elements are beyond the visible 2 lines
            const marks = element.querySelectorAll('mark');
            let hasHiddenMatch = false;
            
            if (marks.length > 0) {
              const containerRect = element.getBoundingClientRect();
              marks.forEach((mark) => {
                const markRect = mark.getBoundingClientRect();
                // If mark's top is beyond the container's visible bottom (2 lines)
                if (markRect.top >= containerRect.top + maxHeight - 1) {
                  hasHiddenMatch = true;
                }
              });
            } else {
              // Fallback: if content exceeds 2 lines and has a match, expand to be safe
              const exceedsTwoLines = element.scrollHeight > maxHeight + 1;
              if (exceedsTwoLines) {
                // Estimate if match is likely beyond 2 lines based on character position
                const matchIndex = songsLower.indexOf(searchLower);
                const estimatedCharsPerLine = 50;
                const twoLinesChars = estimatedCharsPerLine * 2;
                hasHiddenMatch = matchIndex > twoLinesChars;
              }
            }
            
            // Restore original style
            element.style.cssText = tempStyle;
            
            if (hasHiddenMatch) {
              setIsExpanded(true);
            }
          });
        });
      }
    }
  }, [searchQuery, artistQuery, songsText, isExpanded, highlightTerm]);
  
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
      } else {
        // If expanded, check if it would need control when collapsed
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 18.2;
        const maxHeight = lineHeight * 2;
        const needsControl = element.scrollHeight > maxHeight + 1;
        setNeedsExpandControl(needsControl);
      }
    }
  }, [songsText, isExpanded, searchQuery, artistQuery]); // Added searchQuery and artistQuery to dependencies
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the item click
    setIsExpanded(!isExpanded);
  };

  return (
    <ProgressionItem $selected={isSelected} onClick={onClick}>
      <ProgressionName>
        <HighlightText text={progression.name} searchTerm={searchQuery} />
      </ProgressionName>
      <ProgressionChords>
        {progression.progression.map((chord, i) => (
          <ChordBadge key={i}>{toSuperscript(chord)}</ChordBadge>
        ))}
      </ProgressionChords>
      <ProgressionKey>Key: {progression.key}</ProgressionKey>
      <div>
        <ProgressionSongsContainer ref={containerRef} $expanded={isExpanded}>
          <HighlightText text={songsText} searchTerm={highlightTerm || ''} />
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

