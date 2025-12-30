import React, {useRef, useEffect, useState} from 'react';
import {draggable} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import styled from 'styled-components';

const CandidateCard = styled.div<{$isDragging: boolean; $isJustMoved: boolean; $height: number; $padding: number; $horizontal: boolean}>`
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
  background-color: ${props => props.$isDragging || props.$isJustMoved ? '#e3f2fd' : '#fff'};
  border: ${props => {
    if (props.$isDragging || props.$isJustMoved) {
      return '2px solid #2196f3';
    }
    return '1px solid #ccc';
  }};
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  transition: ${props => {
    if (props.$isJustMoved) {
      return 'background-color 0.5s ease-out, border 0.5s ease-out';
    }
    return 'background-color 0.2s, border 0.2s';
  }};
  box-sizing: border-box;
  box-shadow: ${props => props.$isDragging || props.$isJustMoved ? '0 2px 8px rgba(33, 150, 243, 0.3)' : 'none'};
  
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
        // The library will use the element's current styles for the preview
        // Our styled component will handle the border and background
      },
      onDrop: () => setIsDragging(false),
    });
  }, [candidateName, electionTitle, currentScore]);

  // Handle fade-out animation for just-moved items
  useEffect(() => {
    if (isJustMoved && onJustMovedEnd) {
      const timer = setTimeout(() => {
        onJustMovedEnd();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isJustMoved, onJustMovedEnd]);

  return (
    <CandidateCard ref={ref} $isDragging={isDragging} $isJustMoved={isJustMoved} $height={height} $padding={padding} $horizontal={horizontal}>
      {candidateName}
    </CandidateCard>
  );
}

