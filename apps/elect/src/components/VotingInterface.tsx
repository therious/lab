import React from 'react';
import styled from 'styled-components';
import {useSelector} from '../actions-integration';
import {actions} from '../actions-integration';
import {TotalState} from '../actions/combined-slices';
import {DraggableCandidate} from './DraggableCandidate';
import {ScoreBand} from './ScoreBand';

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
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const RightPanel = styled.div`
  flex: 1;
  padding: 1rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow-y: auto;
`;

const ApproveGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const RejectGroup = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 3px solid #dc3545;
`;

const GroupLabel = styled.div`
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #333;
`;

const UnrankedSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px dashed #999;
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
    color: '#4caf50',
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
    color: '#f44336',
    tooltip: 'Candidates who are unqualified or unacceptable for office, regardless of their policy positions.',
  },
];

export function VotingInterface({electionTitle}: VotingInterfaceProps) {
  const {elections, votes} = useSelector((s: TotalState) => s.election);
  const election = elections.find((e: {title: string}) => e.title === electionTitle);
  const vote = votes[electionTitle];

  if (!election || !vote) {
    return <div>Election not found</div>;
  }

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
        <LeftPanel>
          <ApproveGroup>
            <GroupLabel title="Rank candidates based on their qualifications and ability to perform the job duties, independent of policy positions. This is about competence and fitness for office, not political alignment.">Approve</GroupLabel>
            {BAND_CONFIG.slice(0, 5).reverse().map(({score, label, color, tooltip}) => (
              <ScoreBand
                key={score}
                score={score}
                label={label}
                color={color}
                tooltip={tooltip}
                candidates={vote[score] || []}
                electionTitle={electionTitle}
                onDrop={(candidateName, fromScore, toIndex) => handleDrop(candidateName, fromScore, score, toIndex)}
                onReorder={(fromIndex, toIndex) => handleReorder(score, fromIndex, toIndex)}
              />
            ))}
          </ApproveGroup>
          <RejectGroup>
            <GroupLabel title="Candidates who are unqualified or unacceptable for office, regardless of their policy positions. This assessment is based on competence, integrity, and fitness for the role, not political alignment.">Reject</GroupLabel>
            <ScoreBand
              score="0"
              label="Unqualified/Unacceptable"
              color={BAND_CONFIG[5].color}
              candidates={vote['0'] || []}
              electionTitle={electionTitle}
              onDrop={(candidateName, fromScore, toIndex) => handleDrop(candidateName, fromScore, '0', toIndex)}
              onReorder={(fromIndex, toIndex) => handleReorder('0', fromIndex, toIndex)}
            />
          </RejectGroup>
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

