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
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let previewElement: HTMLDivElement | null = null;
    let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

    return draggable({
      element,
      getInitialData: () => ({
        candidateName,
        electionTitle,
        currentScore,
      }),
      onDragStart: ({nativeSetDragImage, location}) => {
        setIsDragging(true);
        
        // Hide native drag preview by using an empty transparent image
        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        if (nativeSetDragImage) {
          nativeSetDragImage(emptyImg, 0, 0);
        }
        
        // Create custom drag preview element
        const rect = element.getBoundingClientRect();
        previewElement = document.createElement('div');
        previewElement.textContent = candidateName;
        previewElement.style.position = 'fixed';
        previewElement.style.left = `${location.current.input.clientX - rect.width / 2}px`;
        previewElement.style.top = `${location.current.input.clientY - rect.height / 2}px`;
        previewElement.style.width = `${rect.width}px`;
        previewElement.style.height = `${rect.height}px`;
        previewElement.style.padding = `${padding}px`;
        previewElement.style.backgroundColor = '#e3f2fd';
        previewElement.style.border = '2px solid #2196f3';
        previewElement.style.borderRadius = '4px';
        previewElement.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
        previewElement.style.display = 'flex';
        previewElement.style.alignItems = 'center';
        previewElement.style.pointerEvents = 'none';
        previewElement.style.zIndex = '9999';
        previewElement.style.opacity = '1';
        previewElement.style.boxSizing = 'border-box';
        document.body.appendChild(previewElement);
        previewRef.current = previewElement;
        
        // Update preview position as mouse moves
        mouseMoveHandler = (e: MouseEvent) => {
          if (previewElement) {
            previewElement.style.left = `${e.clientX - rect.width / 2}px`;
            previewElement.style.top = `${e.clientY - rect.height / 2}px`;
          }
        };
        document.addEventListener('mousemove', mouseMoveHandler);
      },
      onDrag: ({location}) => {
        // Update preview position during drag
        if (previewElement && location.current.input) {
          const rect = element.getBoundingClientRect();
          previewElement.style.left = `${location.current.input.clientX - rect.width / 2}px`;
          previewElement.style.top = `${location.current.input.clientY - rect.height / 2}px`;
        }
      },
      onDrop: () => {
        setIsDragging(false);
        // Clean up preview element
        if (previewElement && document.body.contains(previewElement)) {
          document.body.removeChild(previewElement);
        }
        previewElement = null;
        previewRef.current = null;
        if (mouseMoveHandler) {
          document.removeEventListener('mousemove', mouseMoveHandler);
          mouseMoveHandler = null;
        }
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
      {candidateName}
    </CandidateCard>
  );
}

