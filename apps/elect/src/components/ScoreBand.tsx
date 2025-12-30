import React, {useRef, useEffect, useState} from 'react';
import {dropTargetForElements} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {DraggableCandidate} from './DraggableCandidate';
import styled from 'styled-components';

const BandContainer = styled.div<{$isOver: boolean; $color: string; $padding: number; $gap: number; $horizontal: boolean}>`
  min-height: ${props => props.$horizontal ? 'auto' : '60px'};
  padding: ${props => props.$padding}px;
  margin: 0.5rem 0;
  background-color: ${props => props.$isOver ? props.$color + 'dd' : props.$color + '33'};
  border: 2px solid ${props => props.$color};
  border-radius: 8px;
  transition: background-color 0.2s;
  display: flex;
  flex-direction: ${props => props.$horizontal ? 'row' : 'column'};
  flex-wrap: ${props => props.$horizontal ? 'wrap' : 'nowrap'};
  gap: ${props => props.$gap}px;
  position: relative;
  align-items: ${props => props.$horizontal ? 'center' : 'stretch'};
`;

const BandLabel = styled.div`
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #333;
  cursor: help;
`;

const InsertionLine = styled.div<{$top: number; $visible: boolean; $color: string}>`
  position: absolute;
  left: 0.25rem;
  right: 0.25rem;
  top: ${props => props.$top}px;
  height: 4px;
  background-color: #000;
  border: 1px solid #fff;
  border-radius: 2px;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.1s;
  pointer-events: none;
  z-index: 10;
  box-shadow: 
    0 0 0 2px ${props => props.$color || '#007bff'},
    0 0 12px rgba(0, 0, 0, 0.6),
    0 0 6px rgba(0, 0, 0, 0.4);
`;

const CandidateWrapper = styled.div<{$isDraggedOver: boolean; $horizontal: boolean}>`
  position: relative;
  opacity: ${props => props.$isDraggedOver ? 0.5 : 1};
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  ${props => props.$horizontal ? `
    flex: 1;
    min-width: 0;
  ` : `
    width: 100%;
  `}
`;

const Triangle = styled.div<{$highlighted: boolean}>`
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 12px solid ${props => props.$highlighted ? '#007bff' : '#666'};
  margin: 0 4px;
  flex-shrink: 0;
  transition: border-left-color 0.2s;
  ${props => props.$highlighted ? `
    filter: drop-shadow(0 0 4px rgba(0, 123, 255, 0.8));
  ` : ''}
`;

const InsertionTriangle = styled.div<{$side: 'left' | 'right'; $visible: boolean}>`
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  ${props => props.$side === 'left' ? `
    border-right: 16px solid #007bff;
    margin-right: 4px;
  ` : `
    border-left: 16px solid #007bff;
    margin-left: 4px;
  `}
  flex-shrink: 0;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.1s;
  filter: drop-shadow(0 0 6px rgba(0, 123, 255, 0.9));
  z-index: 10;
`;

interface ScoreBandProps {
  score: string;
  label: string;
  color: string;
  tooltip?: string;
  candidates: string[];
  electionTitle: string;
  padding?: number;
  gap?: number;
  candidateHeight?: number;
  candidatePadding?: number;
  horizontal?: boolean;
  onDrop: (candidateName: string, fromScore: string, toIndex: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function ScoreBand({
  score,
  label,
  color,
  tooltip,
  candidates,
  electionTitle,
  padding = 8,
  gap = 4,
  candidateHeight = 48,
  candidatePadding = 12,
  horizontal = false,
  onDrop,
  onReorder,
}: ScoreBandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [insertionTop, setInsertionTop] = useState<number>(0);
  const [highlightedTriangles, setHighlightedTriangles] = useState<Set<number>>(new Set());

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const calculateInsertionIndex = (clientY: number, clientX?: number): number => {
      const rect = element.getBoundingClientRect();
      
      if (horizontal && clientX !== undefined) {
        // Horizontal layout: use X position
        const relativeX = clientX - rect.left;
        const candidateElements = element.querySelectorAll('[data-candidate-index]');
        
        if (candidateElements.length === 0) {
          return 0;
        }

        // Check if we're to the left of the first candidate
        const firstElement = candidateElements[0] as HTMLElement;
        const firstLeft = firstElement.offsetLeft;
        if (relativeX < firstLeft + firstElement.offsetWidth / 2) {
          return 0;
        }

        // Check each candidate to find insertion point
        for (let i = 0; i < candidateElements.length; i++) {
          const candidateElement = candidateElements[i] as HTMLElement;
          const candidateLeft = candidateElement.offsetLeft;
          const candidateWidth = candidateElement.offsetWidth;
          const candidateCenter = candidateLeft + candidateWidth / 2;
          
          if (relativeX < candidateCenter) {
            return i;
          }
        }

        return candidateElements.length;
      } else {
        // Vertical layout: use Y position
        const relativeY = clientY - rect.top;
        
        // Get all candidate elements
        const candidateElements = element.querySelectorAll('[data-candidate-index]');
        
        if (candidateElements.length === 0) {
          return 0;
        }

        // Check if we're above the first candidate
        const firstElement = candidateElements[0] as HTMLElement;
        const firstTop = firstElement.offsetTop;
        if (relativeY < firstTop + firstElement.offsetHeight / 2) {
          return 0;
        }

        // Check each candidate to find insertion point
        for (let i = 0; i < candidateElements.length; i++) {
          const candidateElement = candidateElements[i] as HTMLElement;
          const candidateTop = candidateElement.offsetTop;
          const candidateHeight = candidateElement.offsetHeight;
          const candidateCenter = candidateTop + candidateHeight / 2;
          
          if (relativeY < candidateCenter) {
            return i;
          }
        }

        // If we're below all candidates, insert at the end
        return candidateElements.length;
      }
    };

    const calculateInsertionTop = (index: number): number => {
      const candidateElements = element.querySelectorAll('[data-candidate-index]');
      
      if (index === 0) {
        const firstElement = candidateElements[0] as HTMLElement;
        if (firstElement) {
          return firstElement.offsetTop;
        }
        return 30; // Default position after label
      }

      if (index >= candidateElements.length) {
        const lastElement = candidateElements[candidateElements.length - 1] as HTMLElement;
        if (lastElement) {
          return lastElement.offsetTop + lastElement.offsetHeight;
        }
        return 30;
      }

      const targetElement = candidateElements[index] as HTMLElement;
      if (targetElement) {
        return targetElement.offsetTop;
      }
      return 30;
    };

    return dropTargetForElements({
      element,
      getData: () => ({score, electionTitle}),
      onDragEnter: () => {
        setIsOver(true);
        setInsertionIndex(0);
      },
      onDrag: ({location}) => {
        if (location.current.dropTargets.length > 0) {
          const clientY = location.current.input.clientY;
          const clientX = location.current.input.clientX;
          const index = calculateInsertionIndex(clientY, clientX);
          setInsertionIndex(index);
          
          if (horizontal) {
            // Highlight triangles around insertion point
            const newHighlighted = new Set<number>();
            if (index > 0) {
              newHighlighted.add(index - 1); // Triangle before insertion
            }
            if (index < candidates.length) {
              newHighlighted.add(index); // Triangle after insertion
            }
            setHighlightedTriangles(newHighlighted);
          } else {
            setInsertionTop(calculateInsertionTop(index));
          }
        }
      },
      onDragLeave: () => {
        setIsOver(false);
        setInsertionIndex(null);
        setHighlightedTriangles(new Set());
      },
      onDrop: ({source, location}) => {
        setIsOver(false);
        setInsertionIndex(null);
        setHighlightedTriangles(new Set());
        const data = source.data;
        if (data && typeof data === 'object' && 'candidateName' in data && 'currentScore' in data) {
          const candidateName = data.candidateName as string;
          const fromScore = data.currentScore as string;
          
          // Calculate final insertion index
          let finalIndex = candidates.length;
          if (location.current.dropTargets.length > 0) {
            const clientY = location.current.input.clientY;
            const clientX = location.current.input.clientX;
            finalIndex = calculateInsertionIndex(clientY, clientX);
          }
          
          onDrop(candidateName, fromScore, finalIndex);
        }
      },
    });
  }, [score, electionTitle, candidates.length, onDrop]);

  return (
    <BandContainer ref={ref} $isOver={isOver} $color={color} $padding={padding} $gap={gap} $horizontal={horizontal}>
      <BandLabel title={tooltip}>{label}</BandLabel>
      {insertionIndex !== null && !horizontal && (
        <InsertionLine $top={insertionTop} $visible={isOver} $color={color} />
      )}
      {horizontal && insertionIndex === 0 && isOver && (
        <InsertionTriangle $side="left" $visible={true} />
      )}
      {candidates.map((candidate, index) => (
        <React.Fragment key={`${score}-${candidate}-${index}`}>
          {horizontal && index > 0 && (
            <Triangle $highlighted={highlightedTriangles.has(index - 1)} />
          )}
          <CandidateWrapper 
            data-candidate-index={index}
            $isDraggedOver={isOver && insertionIndex === index}
            $horizontal={horizontal}
          >
            <DraggableCandidate
              candidateName={candidate}
              electionTitle={electionTitle}
              currentScore={score}
              height={candidateHeight}
              padding={candidatePadding}
              horizontal={horizontal}
            />
          </CandidateWrapper>
          {horizontal && index === candidates.length - 1 && insertionIndex === candidates.length && isOver && (
            <InsertionTriangle $side="right" $visible={true} />
          )}
        </React.Fragment>
      ))}
    </BandContainer>
  );
}

