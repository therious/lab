import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useSelector} from '../actions-integration';
import {actions} from '../actions-integration';
import {TotalState} from '../actions/combined-slices';
import {Ballot} from '../actions/election-slice';
import {MuuriComponent} from 'muuri-react';
import styled from 'styled-components';
import {BAND_CONFIG} from './constants';
import {
  SummaryContainer,
  CardsContainer,
  MuuriItem,
  ElectionTitle
} from './Layout';

const BallotCard = styled.div`
  border: 2px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  width: max-content;
  height: fit-content;
  box-sizing: border-box;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const BandsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  min-width: max-content;
  box-sizing: border-box;
`;

const BandRow = styled.div<{$color: string}>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: ${props => props.$color}33;
  border: 2px solid ${props => props.$color};
  border-radius: 4px;
  min-height: 2.5rem;
  width: 100%;
  min-width: max-content;
  box-sizing: border-box;
`;

const BandLabel = styled.div`
  font-weight: bold;
  font-size: 0.85rem;
  min-width: 5rem;
  flex-shrink: 0;
  color: #333;
`;

const CandidatesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
`;

const CandidateName = styled.span`
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 3px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const RankBadge = styled.span`
  font-weight: bold;
  font-size: 0.75rem;
  color: #666;
  min-width: 1.25rem;
  text-align: center;
`;

const ToggleSwitch = styled.label<{$checked: boolean}>`
  position: relative;
  display: inline-block;
  width: 7.375rem;
  height: 1.75rem;
  cursor: pointer;
  user-select: none;
`;

const ToggleInput = styled.input.attrs(() => ({type: 'checkbox'}))`
  opacity: 0;
  width: 0;
  height: 0;
  
  &:checked + span {
    background-color: #4caf50;
  }
`;

const ToggleSlider = styled.span<{$checked: boolean}>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 1.75rem;
  transition: 0.3s;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    height: 1.25rem;
    width: 1.25rem;
    left: ${props => props.$checked ? '5.625rem' : '0.5rem'};
    bottom: 0.25rem;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 2;
  }
  
  &::after {
    content: '${props => props.$checked ? 'Confirmed' : 'Unconfirmed'}';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    font-weight: bold;
    color: ${props => props.$checked ? 'white' : '#000'};
    z-index: 1;
    pointer-events: none;
    white-space: nowrap;
    ${props => props.$checked 
      ? 'left: 0.5rem;' 
      : 'right: 0.5rem;'}
  }
`;

const SubmitButton = styled.button<{$enabled: boolean}>`
  padding: 1rem 2rem;
  background: ${props => props.$enabled ? '#4caf50' : '#ccc'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: ${props => props.$enabled ? 'pointer' : 'not-allowed'};
  margin: 2rem auto;
  display: block;

  &:hover:not(:disabled) {
    background: ${props => props.$enabled ? '#45a049' : '#ccc'};
  }
  
  &:disabled:hover {
    background: #ccc;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ModalTitle = styled.h2`
  margin: 0 0 1rem 0;
  color: #333;
`;

const ModalMessage = styled.p`
  margin: 0 0 1.5rem 0;
  color: #666;
  line-height: 1.5;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{$primary?: boolean}>`
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: ${props => props.$primary ? '#4caf50' : '#f5f5f5'};
  color: ${props => props.$primary ? 'white' : '#333'};
  transition: background 0.2s;

  &:hover {
    background: ${props => props.$primary ? '#45a049' : '#e0e0e0'};
  }
`;

export function SummaryView() {
  const {ballots, votes, confirmations, currentElection, token, submitted} = useSelector((s: TotalState) => s.election);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if election is upcoming
  const now = new Date();
  const votingStart = currentElection?.voting_start ? new Date(currentElection.voting_start) : null;
  const isUpcoming = votingStart && now < votingStart;
  const isPreviewToken = token?.startsWith('preview-') || false;

  const allConfirmed = ballots.length > 0 && ballots.every(ballot => confirmations[ballot.title]);
  const canSubmit = !isUpcoming && !isPreviewToken && !submitted && allConfirmed;

  const handleSubmit = async () => {
    if (!currentElection || !token) {
      alert('Missing election or token information');
      return;
    }

    // Prevent submission for upcoming elections
    if (isUpcoming) {
      alert('This election has not yet opened. Voting will begin when the voting window opens.');
      return;
    }

    // Check if token is a preview token
    if (isPreviewToken) {
      alert('This is a preview token for an election that has not yet opened. You can practice with the interface, but votes cannot be submitted until the voting window opens.');
      return;
    }

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          election_identifier: currentElection.identifier,
          token: token,
          ballot_data: votes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccessModal(true);
        setSubmissionError(null);
        // Mark vote as submitted in Redux
        actions.election.markSubmitted();
        // Store voted status in sessionStorage for persistence across refreshes
        sessionStorage.setItem('has_voted', 'true');
      } else {
        // Display the user-friendly error message from the server
        let errorMsg = data.error || 'An unexpected error occurred while submitting your vote. Please try again.';
        
        // Add support information if available
        if (data.support) {
          const supportParts: string[] = [];
          if (data.support.email) supportParts.push(`Email: ${data.support.email}`);
          if (data.support.phone) supportParts.push(`Phone: ${data.support.phone}`);
          if (supportParts.length > 0) {
            errorMsg += `\n\n${data.support.message || 'Contact support:'} ${supportParts.join(', ')}`;
          } else if (data.support.message) {
            errorMsg += `\n\n${data.support.message}`;
          }
        }
        
        setSubmissionError(errorMsg);
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      setSubmissionError('An error occurred while submitting your vote. Please check your connection and try again.');
    }
  };

  return (
    <>
      {showSuccessModal && (
        <ModalOverlay onClick={() => setShowSuccessModal(false)}>
          <ModalContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <ModalTitle>Vote Submitted Successfully!</ModalTitle>
            <ModalMessage>
              Your vote has been recorded. You can view your submitted vote using your view token if needed.
            </ModalMessage>
            <ModalButtons>
              <ModalButton $primary onClick={() => setShowSuccessModal(false)}>
                Close
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}
      
      {submissionError && (
        <ModalOverlay onClick={() => setSubmissionError(null)}>
          <ModalContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <ModalTitle style={{color: '#d32f2f'}}>Submission Error</ModalTitle>
            <ModalMessage>{submissionError}</ModalMessage>
            <ModalButtons>
              <ModalButton $primary onClick={() => setSubmissionError(null)}>
                Close
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}
      
      <SummaryContainer>
        <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <h1 style={{margin: 0}}>{currentElection?.title || 'Election Summary'}</h1>
          {ballots.length > 0 && !submitted && (
            <SubmitButton 
              $enabled={canSubmit} 
              onClick={handleSubmit} 
              disabled={!canSubmit}
              style={{margin: 0}}
            >
              {isUpcoming || isPreviewToken
                ? 'Voting Not Yet Open' 
                : (() => {
                    const unconfirmedCount = ballots.length - Object.values(confirmations).filter(Boolean).length;
                    if (allConfirmed) {
                      return ballots.length === 1 ? 'Submit Ballot' : 'Submit All Ballots';
                    } else {
                      return unconfirmedCount === 1 
                        ? 'Confirm 1 more ballot' 
                        : `Confirm ${unconfirmedCount} more ballots`;
                    }
                  })()}
            </SubmitButton>
          )}
        </div>
        <CardsContainer>
          <MuuriComponent
            dragEnabled={false}
            dragHandle={null}
            layout={{
              fillGaps: true,
              horizontal: false,
              alignRight: false,
              alignBottom: false,
              rounding: false
            }}
          >
      {ballots
        .filter((ballot: Ballot) => votes[ballot.title])
        .map((ballot: Ballot) => {
        const vote = votes[ballot.title];
        
        const isConfirmed = confirmations[ballot.title] || false;
        
        // Calculate ranks for all candidates across bands 0-5
        const candidateRanks: Record<string, number> = {};
        let currentRank = 1;
        
        // Iterate through bands from 5 (best) down to 0 (worst)
        for (let score = 5; score >= 0; score--) {
          const bandCandidates = vote[score.toString()] || [];
          bandCandidates.forEach(candidateName => {
            candidateRanks[candidateName] = currentRank;
            currentRank++;
          });
        }
        
        // Get unranked candidates and limit to 3, then show "N others" (but show name if only 1 remaining)
        const unrankedCandidates = vote['unranked'] || [];
        const unrankedToShow = unrankedCandidates.slice(0, 3);
        const unrankedRemaining = unrankedCandidates.length - 3;
        // If exactly 4 total, show all 4 by name (3 + 1)
        const shouldShowAll = unrankedCandidates.length === 4;
        
        return (
          <MuuriItem key={ballot.title}>
          <BallotCard
            onClick={() => {
              const encodedTitle = encodeURIComponent(ballot.title);
              navigate(`/ballot/${encodedTitle}`);
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '1rem', minWidth: '100%'}}>
              <ElectionTitle style={{margin: 0, flex: '1 1 auto', minWidth: 0}}>{ballot.title}</ElectionTitle>
              {!submitted && (
                <ToggleSwitch
                  $checked={isConfirmed}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                  }}
                  style={{flexShrink: 0}}
                >
                  <ToggleInput
                    checked={isConfirmed}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        actions.election.confirmBallot(ballot.title);
                      } else {
                        actions.election.unconfirmBallot(ballot.title);
                      }
                    }}
                  />
                  <ToggleSlider $checked={isConfirmed} />
                </ToggleSwitch>
              )}
            </div>
            <BandsContainer>
              {BAND_CONFIG.map(({score, label, color}) => {
                const candidates = vote[score] || [];
                if (candidates.length === 0) return null;
                
                return (
                  <BandRow key={score} $color={color}>
                    <BandLabel>{label}</BandLabel>
                    <CandidatesList>
                      {score === 'unranked' ? (
                        <>
                          {shouldShowAll ? (
                            // Show all 4 by name
                            unrankedCandidates.map((candidateName: string, index: number) => (
                              <CandidateName key={`${score}-${candidateName}-${index}`}>
                                <RankBadge>NR</RankBadge>
                                {candidateName}
                              </CandidateName>
                            ))
                          ) : (
                            <>
                              {unrankedToShow.map((candidateName: string, index: number) => (
                                <CandidateName key={`${score}-${candidateName}-${index}`}>
                                  <RankBadge>NR</RankBadge>
                                  {candidateName}
                                </CandidateName>
                              ))}
                              {unrankedRemaining > 1 && (
                                <CandidateName style={{fontStyle: 'italic', color: '#666'}}>
                                  {unrankedRemaining} others
                                </CandidateName>
                              )}
                              {unrankedRemaining === 1 && (
                                <CandidateName>
                                  <RankBadge>NR</RankBadge>
                                  {unrankedCandidates[3]}
                                </CandidateName>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        candidates.map((candidateName: string, index: number) => (
                          <CandidateName key={`${score}-${candidateName}-${index}`}>
                            {candidateRanks[candidateName] && <RankBadge>{candidateRanks[candidateName]}</RankBadge>}
                            {candidateName}
                          </CandidateName>
                        ))
                      )}
                    </CandidatesList>
                  </BandRow>
                );
              })}
            </BandsContainer>
          </BallotCard>
          </MuuriItem>
        );
      })}
          </MuuriComponent>
        </CardsContainer>
      {submitted && (
        <div style={{textAlign: 'center', padding: '2rem', color: '#4caf50', fontSize: '1.2rem', fontWeight: 'bold'}}>
          ✓ Your vote has been successfully submitted
        </div>
      )}
    </SummaryContainer>
    </>
  );
}

