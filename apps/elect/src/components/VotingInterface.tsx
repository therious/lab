import React, {useRef} from 'react';
import styled from 'styled-components';
import {useSelector} from '../actions-integration';
import {actions} from '../actions-integration';
import {TotalState} from '../actions/combined-slices';
import {DraggableCandidate} from './DraggableCandidate';
import {ScoreBand} from './ScoreBand';
import {useResponsiveSpacing} from './useResponsiveSpacing';

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
  justify-content: center;
  align-items: center;
  background-color: #f9f9f9;
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
  padding: 1rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const RightPanel = styled.div`
  flex: 1;
  padding: 1rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
`;

const AllBandsContainer = styled.div<{$gap: number}>`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
`;

const GroupLabelContainer = styled.div<{$span: number}>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem;
  border-right: 3px solid #333;
  grid-column: 1;
  grid-row: ${props => `span ${props.$span}`};
  min-width: 2rem;
`;

const GroupLabel = styled.div`
  font-weight: bold;
  font-size: 1.1rem;
  color: #333;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  white-space: nowrap;
`;

const BandsContainer = styled.div<{$gap: number}>`
  display: flex;
  flex-direction: column;
  gap: ${props => props.$gap}px;
  grid-column: 2;
  flex: 1;
  min-height: 0;
  width: 100%;
`;

const RejectBandWrapper = styled.div`
  grid-column: 2;
  width: 100%;
  min-width: 0;
`;

const UnrankedSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px dashed #999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UnrankedLabel = styled.div`
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #666;
  cursor: help;
`;

interface VotingInterfaceProps {
  electionTitle: string;
}

const BAND_CONFIG = [
  {
    score: '5',
    label: 'Excellent',
    color: '#2e7d32', // Darker, more saturated green
    tooltip: 'Highly qualified candidates with exceptional competence and strong track record. Note: There is no strategic benefit to exaggerating how good a candidate is - rate them honestly based on their actual qualifications and performance.',
  },
  {
    score: '4',
    label: 'Good',
    color: '#8bc34a',
    tooltip: 'Well-qualified candidates who demonstrate solid competence and are capable of performing the job duties effectively.',
  },
  {
    score: '3',
    label: 'Mediocre',
    color: '#ffeb3b',
    tooltip: 'Candidates with adequate qualifications who are unlikely to cause significant harm in office, though they may lack exceptional competence or vision.',
  },
  {
    score: '2',
    label: 'Bad',
    color: '#ff9800',
    tooltip: 'Candidates with concerning qualifications or performance issues that raise doubts about their ability to perform the job duties adequately.',
  },
  {
    score: '1',
    label: 'Very Bad',
    color: '#ff6b6b',
    tooltip: 'Candidates with serious qualification deficiencies or problematic track records. Note: There is no strategic benefit to exaggerating how bad a candidate is - rate them honestly based on their actual qualifications and performance.',
  },
  {
    score: '0',
    label: 'Unqualified/Unacceptable',
    color: '#444444', // Medium dark grey
    tooltip: 'Candidates who are unqualified or unacceptable for office, regardless of their policy positions.',
  },
];

export function VotingInterface({electionTitle}: VotingInterfaceProps) {
  const {elections, votes} = useSelector((s: TotalState) => s.election);
  const election = elections.find((e: {title: string}) => e.title === electionTitle);
  const vote = votes[electionTitle];
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const bandsContainerRef = useRef<HTMLDivElement>(null);

  if (!election || !vote) {
    return <div>Election not found</div>;
  }

  // Calculate total candidates and bands for spacing
  const totalCandidates = Object.keys(vote)
    .filter(key => key !== 'unranked')
    .reduce((sum, key) => sum + (vote[key]?.length || 0), 0);
  const totalBands = 6; // 5 approve bands + 1 reject band

  const spacing = useResponsiveSpacing(leftPanelRef, bandsContainerRef, totalCandidates, totalBands);

  const handleReset = () => {
    actions.election.resetElection(electionTitle);
  };

  const handleDrop = (candidateName: string, fromScore: string, toScore: string, toIndex: number) => {
    actions.election.moveCandidate(electionTitle, candidateName, fromScore, toScore, toIndex);
  };

  const handleReorder = (score: string, fromIndex: number, toIndex: number) => {
    actions.election.reorderCandidate(electionTitle, score, fromIndex, toIndex);
  };

  return (
    <Container>
      <TopPanel>
        <ResetButton onClick={handleReset}>Reset</ResetButton>
      </TopPanel>
      <BottomPanels>
        <LeftPanel ref={leftPanelRef}>
          <AllBandsContainer $gap={spacing.bandGap}>
            <GroupLabelContainer $span={5}>
              <GroupLabel title="Rank candidates based on their qualifications and ability to perform the job duties, independent of policy positions. This is about competence and fitness for office, not political alignment.">Approve</GroupLabel>
            </GroupLabelContainer>
            <BandsContainer ref={bandsContainerRef} $gap={spacing.bandGap}>
              {BAND_CONFIG.slice(0, 5).map(({score, label, color, tooltip}) => (
                <ScoreBand
                  key={score}
                  score={score}
                  label={label}
                  color={color}
                  tooltip={tooltip}
                  candidates={vote[score] || []}
                  electionTitle={electionTitle}
                  padding={spacing.bandPadding}
                  gap={spacing.candidateGap}
                  candidateHeight={spacing.candidateHeight}
                  candidatePadding={spacing.candidatePadding}
                  horizontal={spacing.horizontal}
                  onDrop={(candidateName, fromScore, toIndex) => handleDrop(candidateName, fromScore, score, toIndex)}
                  onReorder={(fromIndex, toIndex) => handleReorder(score, fromIndex, toIndex)}
                />
              ))}
            </BandsContainer>
            <GroupLabelContainer $span={1}>
              <GroupLabel title="Candidates who are unqualified or unacceptable for office, regardless of their policy positions. This assessment is based on competence, integrity, and fitness for the role, not political alignment.">Reject</GroupLabel>
            </GroupLabelContainer>
            <RejectBandWrapper>
              <ScoreBand
                score="0"
                label="Unqualified/Unacceptable"
                color={BAND_CONFIG[5].color}
                tooltip={BAND_CONFIG[5].tooltip}
                candidates={vote['0'] || []}
                electionTitle={electionTitle}
                padding={spacing.bandPadding}
                gap={spacing.candidateGap}
                candidateHeight={spacing.candidateHeight}
                candidatePadding={spacing.candidatePadding}
                horizontal={spacing.horizontal}
                onDrop={(candidateName, fromScore, toIndex) => handleDrop(candidateName, fromScore, '0', toIndex)}
                onReorder={(fromIndex, toIndex) => handleReorder('0', fromIndex, toIndex)}
              />
            </RejectBandWrapper>
          </AllBandsContainer>
        </LeftPanel>
        <RightPanel>
          <UnrankedSection>
            <UnrankedLabel title="Candidates you are unfamiliar with or have not yet ranked. Important: Unranked candidates receive no strategic advantage in the voting process over candidates you actively dislike. You should express an opinion about candidates you are unfamiliar with to ensure your vote accurately reflects your preferences.">Unranked Candidates</UnrankedLabel>
            {vote.unranked && vote.unranked.length > 0 ? (
              vote.unranked.map((candidateName: string) => (
                <DraggableCandidate
                  key={candidateName}
                  candidateName={candidateName}
                  electionTitle={electionTitle}
                  currentScore="unranked"
                  height={spacing.candidateHeight}
                  padding={spacing.candidatePadding}
                  horizontal={false}
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

