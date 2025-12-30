import React, {useRef, useEffect, useState} from 'react';
import {draggable} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import styled from 'styled-components';

const CandidateCard = styled.div<{$isDragging: boolean}>`
  padding: 0.75rem;
  margin: 0.5rem 0;
  background-color: ${props => props.$isDragging ? '#e3f2fd' : '#fff'};
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  transition: background-color 0.2s;
  
  &:active {
    cursor: grabbing;
  }
`;

interface DraggableCandidateProps {
  candidateName: string;
  electionTitle: string;
  currentScore: string;
}

export function DraggableCandidate({candidateName, electionTitle, currentScore}: DraggableCandidateProps) {
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
    <CandidateCard ref={ref} $isDragging={isDragging}>
      {candidateName}
    </CandidateCard>
  );
}

