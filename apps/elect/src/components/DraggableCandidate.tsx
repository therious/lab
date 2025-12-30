import React, {useRef, useEffect, useState} from 'react';
import {draggable} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import styled from 'styled-components';

const RankBadge = styled.div`
  font-weight: bold;
  font-size: 0.85rem;
  color: #666;
  min-width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
`;

const AffiliationText = styled.div`
  font-size: 0.8rem;
  color: #888;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
`;

const CandidateName = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CandidateCard = styled.div<{$isDragging: boolean; $isJustMoved: boolean; $isFadingOut: boolean; $height: number; $padding: number; $horizontal: boolean}>`
  padding: ${props => props.$padding}px;
  margin: 0;
  height: ${props => props.$height}px;
  min-height: ${props => props.$height}px;
  max-height: ${props => props.$height}px;
  ${props => props.$horizontal ? `
    flex: 1;
    min-width: 0;
  ` : `
    width: 100%;
  `}
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${props => {
    if (props.$isJustMoved) return '#e3f2fd';
    if (props.$isFadingOut) return '#fff';
    return '#fff';
  }};
  border: ${props => {
    if (props.$isJustMoved) return '2px solid #2196f3';
    if (props.$isFadingOut) return '1px solid #ccc';
    return '1px solid #ccc';
  }};
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  transition: ${props => {
    if (props.$isJustMoved || props.$isFadingOut) {
      return 'background-color 0.5s ease-out, border 0.5s ease-out, box-shadow 0.5s ease-out';
    }
    return 'background-color 0.2s, border 0.2s';
  }};
  box-sizing: border-box;
  box-shadow: ${props => {
    if (props.$isJustMoved) return '0 2px 8px rgba(33, 150, 243, 0.3)';
    if (props.$isFadingOut) return 'none';
    return 'none';
  }};
  opacity: ${props => props.$isDragging ? '0.5' : '1'};
  
  &:active {
    cursor: grabbing;
  }
`;

interface DraggableCandidateProps {
  candidateName: string;
  electionTitle: string;
  currentScore: string;
  height?: number;
  padding?: number;
  horizontal?: boolean;
  rank?: number;
  affiliation?: string;
  isJustMoved?: boolean;
  onJustMovedEnd?: () => void;
}

export function DraggableCandidate({candidateName, electionTitle, currentScore, height = 48, padding = 12, horizontal = false, rank, affiliation, isJustMoved = false, onJustMovedEnd}: DraggableCandidateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return draggable({
      element,
      getInitialData: () => ({
        candidateName,
        electionTitle,
        currentScore,
      }),
      onGenerateDragPreview: ({nativeSetDragImage}) => {
        // Create a styled clone for the drag preview
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        const clone = element.cloneNode(true) as HTMLElement;
        
        // Get actual width and height from computed styles
        const actualWidth = rect.width;
        const actualHeight = rect.height;
        
        // Apply highlight styles to clone with fixed dimensions
        clone.style.backgroundColor = '#e3f2fd';
        clone.style.border = '2px solid #2196f3';
        clone.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
        clone.style.position = 'fixed';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.width = `${actualWidth}px`;
        clone.style.height = `${actualHeight}px`;
        clone.style.minWidth = `${actualWidth}px`;
        clone.style.maxWidth = `${actualWidth}px`;
        clone.style.opacity = '1';
        clone.style.boxSizing = 'border-box';
        clone.style.flex = 'none'; // Prevent flex expansion
        document.body.appendChild(clone);
        
        // Use the clone as drag image
        if (nativeSetDragImage) {
          // Calculate offset to center the preview on cursor
          const offsetX = actualWidth / 2;
          const offsetY = actualHeight / 2;
          nativeSetDragImage(clone, offsetX, offsetY);
        }
        
        // Clean up clone after a brief delay
        setTimeout(() => {
          if (document.body.contains(clone)) {
            document.body.removeChild(clone);
          }
        }, 0);
      },
      onDragStart: () => {
        setIsDragging(true);
      },
      onDrop: () => {
        setIsDragging(false);
      },
    });
  }, [candidateName, electionTitle, currentScore, padding]);

  // Handle fade-out animation for just-moved items
  useEffect(() => {
    if (isJustMoved) {
      // Start fade-out after a brief delay to show the highlight
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 100);
      
      // Complete the fade and notify parent after transition
      const completeTimer = setTimeout(() => {
        setIsFadingOut(false);
        if (onJustMovedEnd) {
          onJustMovedEnd();
        }
      }, 600); // 100ms delay + 500ms transition
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setIsFadingOut(false);
    }
  }, [isJustMoved, onJustMovedEnd]);

  return (
    <CandidateCard ref={ref} $isDragging={isDragging} $isJustMoved={isJustMoved} $isFadingOut={isFadingOut} $height={height} $padding={padding} $horizontal={horizontal}>
      {rank !== undefined && <RankBadge>{rank}</RankBadge>}
      {affiliation && <AffiliationText>{affiliation}</AffiliationText>}
      <CandidateName>{candidateName}</CandidateName>
    </CandidateCard>
  );
}

