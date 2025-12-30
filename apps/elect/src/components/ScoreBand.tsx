import React, {useRef, useEffect, useState} from 'react';
import {dropTargetForElements} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {DraggableCandidate} from './DraggableCandidate';
import styled from 'styled-components';

const BandContainer = styled.div<{$isOver: boolean; $color: string}>`
  min-height: 60px;
  padding: 0.5rem;
  margin: 0.5rem 0;
  background-color: ${props => props.$isOver ? props.$color + 'dd' : props.$color + '33'};
  border: 2px solid ${props => props.$color};
  border-radius: 8px;
  transition: background-color 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const BandLabel = styled.div`
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #333;
`;

const CandidateSlot = styled.div`
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
`;

interface ScoreBandProps {
  score: string;
  label: string;
  color: string;
  candidates: string[];
  electionTitle: string;
  onDrop: (candidateName: string, fromScore: string, toIndex: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function ScoreBand({score, label, color, candidates, electionTitle, onDrop, onReorder}: ScoreBandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => ({score, electionTitle}),
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: ({source}) => {
        setIsOver(false);
        const data = source.data;
        if (data && typeof data === 'object' && 'candidateName' in data && 'currentScore' in data) {
          const candidateName = data.candidateName as string;
          const fromScore = data.currentScore as string;
          // Calculate drop index based on mouse position
          // For now, append to end
          onDrop(candidateName, fromScore, candidates.length);
        }
      },
    });
  }, [score, electionTitle, candidates.length, onDrop]);

  return (
    <BandContainer ref={ref} $isOver={isOver} $color={color}>
      <BandLabel>{label}</BandLabel>
      {candidates.map((candidate, index) => (
        <DraggableCandidate
          key={`${score}-${candidate}-${index}`}
          candidateName={candidate}
          electionTitle={electionTitle}
          currentScore={score}
        />
      ))}
    </BandContainer>
  );
}

