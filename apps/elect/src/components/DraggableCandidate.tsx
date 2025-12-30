import React, {useRef, useEffect, useState} from 'react';
import {draggable} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import styled from 'styled-components';

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
  isJustMoved?: boolean;
  onJustMovedEnd?: () => void;
}

export function DraggableCandidate({candidateName, electionTitle, currentScore, height = 48, padding = 12, horizontal = false, isJustMoved = false, onJustMovedEnd}: DraggableCandidateProps) {
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
      onDragStart: () => {
        setIsDragging(true);
        
        // Temporarily apply highlight styles to element for drag preview
        // The library will capture these styles for the preview
        const originalStyles = {
          backgroundColor: element.style.backgroundColor,
          border: element.style.border,
          boxShadow: element.style.boxShadow,
        };
        
        element.style.backgroundColor = '#e3f2fd';
        element.style.border = '2px solid #2196f3';
        element.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
        
        // Restore original styles after browser captures preview
        requestAnimationFrame(() => {
          element.style.backgroundColor = originalStyles.backgroundColor || '';
          element.style.border = originalStyles.border || '';
          element.style.boxShadow = originalStyles.boxShadow || '';
        });
      },
      onDrop: () => setIsDragging(false),
    });
  }, [candidateName, electionTitle, currentScore]);

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
      {candidateName}
    </CandidateCard>
  );
}

