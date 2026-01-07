import React, {useRef, useState, useEffect} from 'react';
import styled from 'styled-components';
import {useSelector} from '../actions-integration';
import {actions} from '../actions-integration';
import {TotalState} from '../actions/combined-slices';
import {DraggableCandidate} from './DraggableCandidate';
import {ScoreBand} from './ScoreBand';
import {useResponsiveSpacing} from './useResponsiveSpacing';
import {dropTargetForElements} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {TOOLTIPS} from './tooltips';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  gap: 1rem;
`;

const TopPanel = styled.div`
  width: 100%;
  padding: 1rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9f9f9;
  gap: 1rem;
`;

const DescriptionText = styled.div`
  flex: 1;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
`;

const ResetButton = styled.button`
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
  
  &:hover {
    background-color: #c82333;
  }
`;

const BottomPanels = styled.div`
  display: flex;
  gap: 1rem;
  flex: 1;
  min-height: 0;
`;

const LeftPanel = styled.div`
  flex: 1;
  padding: 1rem 0.25rem 1rem 0.25rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const RightPanel = styled.div`
  flex: 1;
  padding: 0;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const AllBandsContainer = styled.div<{$gap: number}>`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem;
  flex: 1;
  min-height: 0;
`;

const ArrowContainer = styled.div<{$span: number; $startRow?: number}>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0;
  grid-column: 1;
  ${props => props.$startRow ? `grid-row: ${props.$startRow} / span ${props.$span};` : `grid-row: span ${props.$span};`}
  min-width: 3rem;
  position: relative;
`;

const ArrowLine = styled.div<{$direction: 'up' | 'down'}>`
  flex: 1;
  width: 2px;
  background-color: #333;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  
  &::before {
    content: '';
    position: absolute;
    ${props => props.$direction === 'up' ? 'top: 0;' : 'bottom: 0;'}
    left: 50%;
    transform: translateX(-50%) ${props => props.$direction === 'up' ? 'translateY(-50%)' : 'translateY(50%)'};
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    ${props => props.$direction === 'up' 
      ? 'border-bottom: 10px solid #333;' 
      : 'border-top: 10px solid #333;'}
  }
`;

const ArrowLabel = styled.div`
  font-weight: bold;
  font-size: 0.9rem;
  color: #333;
  white-space: nowrap;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  background-color: #fff;
  padding: 0.25rem 0.1rem;
  position: relative;
  z-index: 1;
`;

const BandsContainer = styled.div<{$gap: number}>`
  display: flex;
  flex-direction: column;
  gap: ${props => props.$gap}px;
  grid-column: 2;
  grid-row: 1 / 6; /* Span rows 1-5 for the 5 approve bands */
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
  z-index: 2;
  height: 100%;
`;

const RejectBandWrapper = styled.div`
  grid-column: 2;
  grid-row: 6; /* After the 5 approve bands (rows 1-5) */
  width: 100%;
  min-width: 0;
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const UnrankedSection = styled.div<{$isOver: boolean; $padding: number; $gap: number}>`
  flex: 1;
  padding: ${props => props.$padding}px;
  margin: 1rem;
  background-color: ${props => props.$isOver ? '#e3f2fddd' : '#e8f4f833'};
  border: 2px solid #90caf9;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: ${props => props.$gap}px;
  transition: background-color 0.2s, border-color 0.2s;
  min-height: 0;
  overflow-y: auto;
  box-sizing: border-box;
`;

const UnrankedLabel = styled.div`
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  color: #666;
`;

interface VotingInterfaceProps {
  ballotTitle: string;
}

const BAND_CONFIG = [
  {
    score: '5',
    label: 'Excellent',
    color: '#2e7d32', // Darker, more saturated green
    tooltip: TOOLTIPS.excellent,
  },
  {
    score: '4',
    label: 'Good',
    color: '#8bc34a',
    tooltip: TOOLTIPS.good,
  },
  {
    score: '3',
    label: 'Mediocre',
    color: '#ffeb3b',
    tooltip: TOOLTIPS.mediocre,
  },
  {
    score: '2',
    label: 'Bad',
    color: '#ff9800',
    tooltip: TOOLTIPS.bad,
  },
  {
    score: '1',
    label: 'Very Bad',
    color: '#ff6b6b',
    tooltip: TOOLTIPS.veryBad,
  },
  {
    score: '0',
    label: 'Unqualified/Unacceptable',
    color: '#444444', // Medium dark grey
    tooltip: TOOLTIPS.unqualified,
  },
];

export function VotingInterface({ballotTitle}: VotingInterfaceProps) {
  const ballots = useSelector((s: TotalState) => s.election.ballots);
  const vote = useSelector((s: TotalState) => s.election.votes[ballotTitle]);
  const ballot = ballots.find((b: {title: string}) => b.title === ballotTitle);
  
  // All hooks must be called before any early returns
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const bandsContainerRef = useRef<HTMLDivElement>(null);
  const unrankedSectionRef = useRef<HTMLDivElement>(null);
  const [justMovedCandidate, setJustMovedCandidate] = useState<string | null>(null);
  const [isUnrankedOver, setIsUnrankedOver] = useState(false);
  
  // Create lookup map from candidate name to candidate object (for affiliation)
  const candidateLookup = React.useMemo(() => {
    if (!ballot) return {};
    const lookup: Record<string, {name: string; affiliation?: string}> = {};
    ballot.candidates.forEach((candidate: {name: string; affiliation?: string}) => {
      lookup[candidate.name] = candidate;
    });
    return lookup;
  }, [ballot]);
  
  // Calculate total candidates and bands for spacing - must be before early return
  const totalCandidates = ballot && vote 
    ? Object.keys(vote)
        .filter(key => key !== 'unranked')
        .reduce((sum, key) => sum + (vote[key]?.length || 0), 0)
    : 0;
  const totalBands = 6; // 5 approve bands + 1 reject band

  const spacing = useResponsiveSpacing(leftPanelRef, bandsContainerRef, totalCandidates, totalBands);
  
  // Set up drop target for unranked section - must be before early return
  useEffect(() => {
    const element = unrankedSectionRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => ({score: 'unranked', ballotTitle}),
      onDragEnter: () => {
        setIsUnrankedOver(true);
      },
      onDragLeave: () => {
        setIsUnrankedOver(false);
      },
      onDrop: ({source}) => {
        setIsUnrankedOver(false);
        const data = source.data;
        if (data && typeof data === 'object' && 'candidateName' in data && 'currentScore' in data) {
          const candidateName = data.candidateName as string;
          const fromScore = data.currentScore as string;
          // Move candidate back to unranked
          actions.election.moveCandidate(ballotTitle, candidateName, fromScore, 'unranked');
        }
      },
    });
  }, [ballotTitle]);
  
  // Calculate ranks for all candidates across bands 0-5 - must be before early return
  // Rank 1 = most preferred (top of band 5), increasing down to least preferred (bottom of band 0)
  const candidateRanks = React.useMemo(() => {
    if (!vote) return {};
    const ranks: Record<string, number> = {};
    let currentRank = 1;
    
    // Iterate through bands from 5 (best) down to 0 (worst)
    for (let score = 5; score >= 0; score--) {
      const scoreKey = String(score);
      const candidates = vote[scoreKey] || [];
      candidates.forEach((candidateName: string) => {
        ranks[candidateName] = currentRank;
        currentRank++;
      });
    }
    
    return ranks;
  }, [vote]);

  if (!ballot || !vote) {
    return <div>Ballot not found</div>;
  }

  const handleReset = () => {
    actions.election.resetBallot(ballotTitle);
    setJustMovedCandidate(null);
  };

  const handleDrop = (candidateName: string, fromScore: string, toScore: string, toIndex: number) => {
    actions.election.moveCandidate(ballotTitle, candidateName, fromScore, toScore, toIndex);
    // Mark this candidate as just moved
    setJustMovedCandidate(candidateName);
  };

  const handleJustMovedEnd = () => {
    setJustMovedCandidate(null);
  };

  const handleReorder = (score: string, fromIndex: number, toIndex: number) => {
    actions.election.reorderCandidate(ballotTitle, score, fromIndex, toIndex);
  };
      const bandCandidates = vote[score.toString()] || [];
      // Within each band, first candidate is most preferred, last is least preferred
      bandCandidates.forEach(candidateName => {
        ranks[candidateName] = currentRank;
        currentRank++;
      });
    }
    
    return ranks;
  }, [vote]);

  return (
    <Container>
      <TopPanel>
        {ballot.description && <DescriptionText>{ballot.description}</DescriptionText>}
        <ResetButton onClick={handleReset}>Reset</ResetButton>
      </TopPanel>
      <BottomPanels>
        <LeftPanel ref={leftPanelRef}>
          <AllBandsContainer $gap={spacing.bandGap}>
            <ArrowContainer $span={5}>
              <ArrowLine $direction="up">
                <ArrowLabel>Better</ArrowLabel>
              </ArrowLine>
            </ArrowContainer>
            <BandsContainer ref={bandsContainerRef} $gap={spacing.bandGap}>
              {BAND_CONFIG.slice(0, 5).map(({score, label, color, tooltip}) => {
                const candidateCount = (vote[score] || []).length;
                // When not in horizontal mode, allocate space proportional to candidate count
                // Use candidateCount + 1 to ensure even empty bands get some space
                const flexGrow = spacing.horizontal ? 1 : Math.max(1, candidateCount + 1);
                return (
                  <ScoreBand
                    key={score}
                    score={score}
                    label={label}
                    color={color}
                    tooltip={tooltip}
                    candidates={vote[score] || []}
                    ballotTitle={ballotTitle}
                    padding={spacing.bandPadding}
                    gap={spacing.candidateGap}
                    candidateHeight={spacing.candidateHeight}
                    candidatePadding={spacing.candidatePadding}
                    horizontal={spacing.horizontal}
                    flexGrow={flexGrow}
                    candidateRanks={candidateRanks}
                    candidateLookup={candidateLookup}
                    justMovedCandidate={justMovedCandidate || undefined}
                    onJustMovedEnd={handleJustMovedEnd}
                    onDrop={(candidateName, fromScore, toIndex) => handleDrop(candidateName, fromScore, score, toIndex)}
                    onReorder={(fromIndex, toIndex) => handleReorder(score, fromIndex, toIndex)}
                  />
                );
              })}
            </BandsContainer>
            <RejectBandWrapper>
              {(() => {
                const candidateCount = (vote['0'] || []).length;
                // When not in horizontal mode, allocate space proportional to candidate count
                const flexGrow = spacing.horizontal ? 1 : Math.max(1, candidateCount + 1);
                return (
                  <ScoreBand
                    score="0"
                    label="Unqualified/Unacceptable"
                    color={BAND_CONFIG[5].color}
                    tooltip={BAND_CONFIG[5].tooltip}
                    candidates={vote['0'] || []}
                    ballotTitle={ballotTitle}
                    padding={spacing.bandPadding}
                    gap={spacing.candidateGap}
                    candidateHeight={spacing.candidateHeight}
                    candidatePadding={spacing.candidatePadding}
                    horizontal={spacing.horizontal}
                    flexGrow={flexGrow}
                    candidateRanks={candidateRanks}
                    candidateLookup={candidateLookup}
                    justMovedCandidate={justMovedCandidate || undefined}
                    onJustMovedEnd={handleJustMovedEnd}
                    onDrop={(candidateName, fromScore, toIndex) => handleDrop(candidateName, fromScore, '0', toIndex)}
                    onReorder={(fromIndex, toIndex) => handleReorder('0', fromIndex, toIndex)}
                  />
                );
              })()}
            </RejectBandWrapper>
          </AllBandsContainer>
        </LeftPanel>
        <RightPanel>
          <UnrankedSection ref={unrankedSectionRef} $isOver={isUnrankedOver} $padding={spacing.bandPadding} $gap={spacing.candidateGap}>
            <UnrankedLabel title={TOOLTIPS.unranked}>Unranked Candidates</UnrankedLabel>
            {vote.unranked && vote.unranked.length > 0 ? (
              vote.unranked.map((candidateName: string) => (
                <DraggableCandidate
                  key={candidateName}
                  candidateName={candidateName}
                  ballotTitle={ballotTitle}
                  currentScore="unranked"
                  height={spacing.candidateHeight}
                  padding={spacing.candidatePadding}
                  horizontal={false}
                  affiliation={candidateLookup[candidateName]?.affiliation}
                />
              ))
            ) : (
              <div style={{color: '#999', fontStyle: 'italic'}}>All candidates have been ranked</div>
            )}
          </UnrankedSection>
        </RightPanel>
      </BottomPanels>
    </Container>
  );
}

