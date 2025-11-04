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
    // Only run this check when we have a query and the container is currently collapsed
    if (!queryToCheck.trim() || !containerRef.current || isExpanded) {
      return;
    }
    
    // When artist search is active, matching songs are sorted to the top, so they should be visible
    // Only check for auto-expansion if it's a regular search query (not artist-specific)
    // OR if we can verify that marks are actually hidden
    const isArtistSearch = !!artistQuery?.trim();
    
    // Wait for React to render the highlighted marks, then check positions
    // Use triple requestAnimationFrame to ensure DOM is fully updated with sorted content
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const element = containerRef.current;
          // Double-check state hasn't changed
          if (!element || isExpanded) return;
          
          // Check if there are any mark elements (highlighted text)
          const marks = element.querySelectorAll('mark');
          if (marks.length === 0) {
            // No highlights to check, don't expand
            return;
          }
          
          // Get the computed styles - check if element is actually collapsed
          const computedStyle = getComputedStyle(element);
          const computedMaxHeight = computedStyle.maxHeight;
          
          // If maxHeight is 'none', element is expanded, so skip
          if (computedMaxHeight === 'none' || !computedMaxHeight) {
            return;
          }
          
          // Parse the computed maxHeight (should be in px like "36.4px")
          const maxHeightPx = parseFloat(computedMaxHeight);
          if (!maxHeightPx || maxHeightPx === 0) {
            return;
          }
          
          // Get the container's bounding rect
          const containerRect = element.getBoundingClientRect();
          const visibleBottom = containerRect.top + maxHeightPx;
          
          // For artist search, matching songs are sorted to top, so check if FIRST mark is visible
          // For regular search, check if ANY mark is hidden
          let hasHiddenMatch = false;
          
          if (isArtistSearch) {
            // For artist search, only expand if the FIRST mark (from sorted matching songs) is hidden
            // This shouldn't happen since matching songs are at the top, but check anyway
            const firstMark = marks[0];
            if (firstMark) {
              const firstMarkRect = firstMark.getBoundingClientRect();
              // If even the first mark is hidden, something is wrong, but don't expand
              // Actually, if first mark is visible, we're good - matching songs are at top
              // Only expand if we find marks BEYOND the first few that are hidden
              // But actually, if artist search is active, matching songs are at top, so all their marks should be visible
              // So we should NOT auto-expand for artist search at all
              return; // Don't auto-expand for artist search
            }
          } else {
            // For regular search, check if any mark is clipped
            for (const mark of marks) {
              const markRect = mark.getBoundingClientRect();
              // If mark's top edge is at or below the visible bottom, it's clipped
              // Use a small buffer (2px) to account for rounding/subpixel rendering
              if (markRect.top >= visibleBottom - 2) {
                hasHiddenMatch = true;
                break; // Found one hidden mark, no need to check others
              }
            }
            
            // Only expand if there are actually hidden matches
            if (hasHiddenMatch) {
              setIsExpanded(true);
            }
          }
        });
      });
    });
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

