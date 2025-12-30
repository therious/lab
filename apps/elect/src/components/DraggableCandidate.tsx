import React, {useRef, useEffect, useState} from 'react';
import {draggable} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import styled from 'styled-components';

const CandidateCard = styled.div<{$isDragging: boolean; $height: number; $padding: number; $horizontal: boolean}>`
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
  background-color: ${props => props.$isDragging ? '#e3f2fd' : '#fff'};
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  transition: background-color 0.2s;
  box-sizing: border-box;
  
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
}

export function DraggableCandidate({candidateName, electionTitle, currentScore, height = 48, padding = 12, horizontal = false}: DraggableCandidateProps) {
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
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [candidateName, electionTitle, currentScore]);

  return (
    <CandidateCard ref={ref} $isDragging={isDragging} $height={height} $padding={padding} $horizontal={horizontal}>
      {candidateName}
    </CandidateCard>
  );
}

