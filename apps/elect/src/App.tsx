import React, {useEffect, useState} from 'react';
import {Routes, Route, Link, useLocation, useNavigate} from 'react-router-dom';
import {useSelector} from './actions-integration';
import {actions} from './actions-integration';
import {TotalState} from './actions/combined-slices';
import {Ballot} from './actions/election-slice';
import {VotingInterface} from './components/VotingInterface';
import {LandingPage} from './components/LandingPage';
import {VoteTimeline} from './components/VoteTimeline';
import styled from 'styled-components';
import {MuuriComponent} from 'muuri-react';

const BAND_CONFIG = [
  { score: '5', label: 'Excellent', color: '#2e7d32' },
  { score: '4', label: 'Good', color: '#8bc34a' },
  { score: '3', label: 'Mediocre', color: '#ffeb3b' },
  { score: '2', label: 'Bad', color: '#ff9800' },
  { score: '1', label: 'Very Bad', color: '#ff6b6b' },
  { score: '0', label: 'Unqualified/Unacceptable', color: '#444444' },
  { score: 'unranked', label: 'Unranked', color: '#90caf9' },
];

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const Navbar = styled.nav`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
`;

const NavLink = styled(Link)<{$active: boolean}>`
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: ${props => props.$active ? '#007bff' : '#333'};
  font-weight: ${props => props.$active ? 'bold' : 'normal'};
  border-bottom: ${props => props.$active ? '2px solid #007bff' : 'none'};
`;

const CenterBody = styled.main`
  flex: 1;
  overflow: auto;
`;

const SummaryContainer = styled.div`
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const CardsContainer = styled.div`
  width: 100%;
  min-height: 200px;
  
  /* Muuri grid container styles */
  .muuri-grid {
    position: relative;
  }
  
  .muuri-item {
    position: absolute;
    width: max-content;
    min-width: 280px;
    z-index: 1;
  }
  
  .muuri-item.muuri-item-dragging {
    z-index: 3;
  }
  
  .muuri-item.muuri-item-releasing {
    z-index: 2;
  }
  
  .muuri-item.muuri-item-hidden {
    z-index: 0;
  }
`;

const MuuriItem = styled.div`
  width: max-content;
  min-width: 280px;
  margin: 0.375rem;
  box-sizing: border-box;
`;

const ElectionSummaryCard = styled(Link)`
  padding: 1rem;
  border: 2px solid #ccc;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: background-color 0.2s;
  flex: 1;
  min-height: 0;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const ElectionTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
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

function SummaryView() {
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

function BallotView() {
  const location = useLocation();
  const ballotTitle = decodeURIComponent(location.pathname.split('/ballot/')[1] || '');
  const {ballots, currentElection} = useSelector((s: TotalState) => s.election);
  const ballot = ballots.find((b: Ballot) => b.title === ballotTitle);

  if (!ballot) {
    return <div>Ballot not found</div>;
  }

  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <h1 style={{padding: '1rem', margin: 0, borderBottom: '1px solid #ccc'}}>{ballot.title}</h1>
      {ballot.description && (
        <p style={{padding: '0 1rem', margin: '0.5rem 0', color: '#666'}}>{ballot.description}</p>
      )}
      <div style={{flex: 1, minHeight: 0}}>
        <VotingInterface ballotTitle={ballotTitle}/>
      </div>
    </div>
  );
}

function ResultsView() {
  const {currentElection} = useSelector((s: TotalState) => s.election);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial results and set up websocket connection
  React.useEffect(() => {
    if (!currentElection) return;
    
    setLoading(true);
    setError(null);
    
    // Helper to process and set results
    const processResults = (data: any) => {
      console.log('[DEBUG] Raw API response:', data);
      
      // API returns: {election_identifier: "...", results: {results: [...], metadata: {...}}}
      // Extract the nested results structure
      let ballots: any[] = [];
      let metadata: any = null;
      
      if (data.results) {
        // Check if results is the nested object with results and metadata
        if (data.results.results && Array.isArray(data.results.results)) {
          ballots = data.results.results;
          metadata = data.results.metadata || null;
        } 
        // Check if results is directly an array (old format)
        else if (Array.isArray(data.results)) {
          ballots = data.results;
          metadata = data.metadata || null;
        }
        // Check if results is an object with a results property
        else if (typeof data.results === 'object' && data.results.results) {
          ballots = Array.isArray(data.results.results) ? data.results.results : [];
          metadata = data.results.metadata || null;
        }
      }
      
      console.log('[DEBUG] Processed results - ballots:', ballots.length, 'metadata:', metadata);
      setResults({ballots, metadata});
      setLoading(false);
    };
    
    // Load initial results via REST API
    fetch(`/api/dashboard/${currentElection.identifier}`, {
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(async res => {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          const errorTitle = titleMatch ? titleMatch[1] : 'Server Error';
          throw new Error(`Server returned HTML instead of JSON: ${errorTitle}`);
        }
        
        const data = await res.json();
        console.log('[DEBUG] API response status:', res.status, 'data:', data);
        
        if (!res.ok) {
          // If we have results despite error status, still try to process them
          if (data.results || data.results?.results) {
            console.log('[DEBUG] API returned error but has results, processing anyway');
            return data;
          }
          // Extract detailed error information
          const errorMsg = data.error || data.error_message || data.debug_info || 'Unable to load results';
          const errorCode = data.error_code || 'unknown_error';
          console.error('[DEBUG] API error:', {errorMsg, errorCode, status: res.status});
          // Only include error code if it provides useful information
          const finalMsg = (errorCode === 'server_error' || errorCode === 'unknown_error') 
            ? errorMsg 
            : `${errorMsg} (${errorCode})`;
          throw new Error(finalMsg);
        }
        return data;
      })
      .then(processResults)
      .catch(err => {
        console.error('Error loading results:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        // Extract clean error message without redundancy
        let errorMsg = err.message || 'Unable to load results';
        // Remove redundant prefixes if present
        errorMsg = errorMsg.replace(/^(Error|Error occurred|An error occurred)[: ]*/i, '');
        // Remove error code suffix if it's redundant
        errorMsg = errorMsg.replace(/\s*\(server_error\)$/i, '');
        setError(errorMsg);
        setLoading(false);
      });
    
    // Set up websocket connection for real-time updates
    let socket: any = null;
    let channel: any = null;
    
    // Dynamically import Phoenix Socket (may not be available in all environments)
    // @ts-ignore - Phoenix doesn't have TypeScript declarations
    import('phoenix').then((phoenix: any) => {
      const Socket = phoenix.Socket;
      socket = new Socket('/socket', {});
      socket.connect();
      
      channel = socket.channel(`dashboard:${currentElection.identifier}`, {});
      
      channel.on('results_updated', (payload: any) => {
        // Update results when server broadcasts new results
        if (payload.results) {
          processResults(payload.results);
        }
      });
      
      channel.join()
        .receive('ok', () => {
          console.log('Joined dashboard channel for', currentElection.identifier);
        })
        .receive('error', (resp: any) => {
          console.error('Unable to join dashboard channel:', resp);
        });
    }).catch((err) => {
      console.warn('Phoenix Socket not available, using REST API only:', err);
    });
    
    // Cleanup: leave channel and disconnect socket
    return () => {
      if (channel) {
        channel.leave();
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentElection]);

  if (!currentElection) {
    return <div style={{padding: '2rem'}}>No election selected</div>;
  }

  if (loading) {
    return <div style={{padding: '2rem'}}>Loading results...</div>;
  }

  if (error) {
    return (
      <div style={{padding: '2rem'}}>
        <h1>Election Results: {currentElection.title}</h1>
        <p style={{color: '#c33'}}>{error}</p>
      </div>
    );
  }

  const ballots = results?.ballots || (Array.isArray(results) ? results : []);
  const metadata = results?.metadata || null;

  if (!ballots || ballots.length === 0) {
    return (
      <div style={{padding: '2rem'}}>
        <h1>Election Results: {currentElection.title}</h1>
        <p style={{color: '#666'}}>No votes have been submitted yet.</p>
        {metadata && (
          <>
            <div style={{marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px'}}>
              <p><strong>Total Ballots Cast:</strong> {metadata.total_votes || 0}</p>
              {metadata.voting_end && (
                <p><strong>Voting Ends:</strong> {new Date(metadata.voting_end).toLocaleString()}</p>
              )}
            </div>
            {metadata.voting_start && metadata.voting_end && (
              <VoteTimeline
                voteTimestamps={metadata.vote_timestamps || []}
                votingStart={metadata.voting_start}
                votingEnd={metadata.voting_end}
                totalVotes={metadata.total_votes || 0}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // Determine election status
  const now = new Date();
  const votingEnd = metadata?.voting_end ? new Date(metadata.voting_end) : null;
  const votingStart = metadata?.voting_start ? new Date(metadata.voting_start) : null;
  const isClosed = votingEnd && now > votingEnd;
  const isOpen = votingStart && votingEnd && now >= votingStart && now <= votingEnd;
  const isUpcoming = votingStart && now < votingStart;
  
  return (
    <div style={{padding: '2rem'}}>
      <h1 style={{marginBottom: '1.3125rem'}}>Election Results: {currentElection.title}</h1>
      {error && (
        <div style={{marginBottom: '1rem', padding: '0.75rem', background: '#ffebee', border: '1px solid #d32f2f', borderRadius: '4px', color: '#c62828'}}>
          <strong>Warning:</strong> {error} (Showing partial results below)
        </div>
      )}
      {metadata && (
        <>
          <div style={{marginBottom: '1rem', padding: '1rem', background: '#e8f4f8', borderRadius: '8px', border: '1px solid #ccc'}}>
            <p style={{display: 'flex', margin: '0.5rem 0'}}>
              <strong style={{minWidth: '140px', textAlign: 'right', marginRight: '1rem'}}>Total Ballots Cast:</strong>
              <span>{metadata.total_votes || 0}</span>
            </p>
            {votingStart && (
              <p style={{display: 'flex', margin: '0.5rem 0'}}>
                <strong style={{minWidth: '140px', textAlign: 'right', marginRight: '1rem'}}>Voting {isUpcoming ? 'Starts' : 'Started'}:</strong>
                <span>{votingStart.toLocaleString()}</span>
              </p>
            )}
            {votingEnd && (
              <p style={{display: 'flex', margin: '0.5rem 0'}}>
                <strong style={{minWidth: '140px', textAlign: 'right', marginRight: '1rem'}}>Voting {isClosed ? 'Ended' : 'Ends'}:</strong>
                <span>{votingEnd.toLocaleString()}</span>
              </p>
            )}
            <p style={{display: 'flex', margin: '0.5rem 0'}}>
              <strong style={{minWidth: '140px', textAlign: 'right', marginRight: '1rem'}}>Status:</strong>
              <span style={{fontWeight: 'bold', color: isClosed ? '#d32f2f' : isOpen ? '#2e7d32' : '#ff9800'}}>
                {isClosed ? 'Closed' : isOpen ? 'Open' : isUpcoming ? 'Upcoming' : 'Unknown'}
              </span>
            </p>
          </div>
          {metadata.voting_start && metadata.voting_end && (
            <div style={{marginBottom: '1rem'}}>
              <VoteTimeline
                voteTimestamps={metadata.vote_timestamps || []}
                votingStart={metadata.voting_start}
                votingEnd={metadata.voting_end}
                totalVotes={metadata.total_votes || 0}
              />
            </div>
          )}
        </>
      )}
      <div style={{marginLeft: '-0.375rem'}}>
        <MuuriComponent
          dragEnabled={false}
          layout={{
            fillGaps: true,
            horizontal: false,
            alignRight: false,
            alignBottom: false,
            rounding: false
          }}
        >
      {ballots
        .filter((ballotResult: any) => ballotResult)
        .map((ballotResult: any, idx: number) => {
        const voteCount = ballotResult.vote_count || 0;
        const hasVotes = voteCount > 0;
        
        return (
          <MuuriItem key={idx}>
          <div style={{border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', width: 'max-content', minWidth: '300px'}}>
            <h2>{ballotResult.ballot_title}</h2>
            {ballotResult.is_referendum && (
              <p style={{fontStyle: 'italic', color: '#666'}}>Referendum</p>
            )}
            {!ballotResult.is_referendum && (
              <p><strong>Elect:</strong> {ballotResult.number_of_winners} out of {ballotResult.candidates?.length || 0} candidates</p>
            )}
            {ballotResult.quorum && (
              <p>
                <strong>Quorum:</strong> {ballotResult.quorum} votes required
                {ballotResult.quorum_status === 'met' ? (
                  <span style={{marginLeft: '0.5rem', color: '#2e7d32', fontWeight: 'bold'}}>✓ Met</span>
                ) : (
                  <span style={{marginLeft: '0.5rem', color: '#d32f2f', fontWeight: 'bold'}}>✗ Not Met ({voteCount}/{ballotResult.quorum})</span>
                )}
              </p>
            )}
            {ballotResult.result_status && (
              <p>
                <strong>Result Status:</strong>
                <span style={{
                  marginLeft: '0.5rem',
                  fontWeight: 'bold',
                  color: ballotResult.result_status === 'in_progress' ? '#ff9800' : 
                         ballotResult.result_status === 'no_quorum' ? '#d32f2f' : '#666'
                }}>
                  {ballotResult.result_status === 'in_progress' ? 'In Progress (Quorum Not Met)' :
                   ballotResult.result_status === 'no_quorum' ? 'No Quorum' :
                   ballotResult.result_status}
                </span>
              </p>
            )}
            
            {hasVotes ? (
              <div style={{marginTop: '1rem'}}>
                <h3>Tally Summary:</h3>
                {ballotResult.results?.score && (
                  <div style={{marginTop: '0.5rem', padding: '0.5rem', background: '#e8f4f8', borderRadius: '4px'}}>
                    <strong>Score Voting (Average Scores):</strong>
                    {ballotResult.results.score.scores && Object.entries(ballotResult.results.score.scores)
                      .sort(([, a]: [string, any], [, b]: [string, any]) => (b || 0) - (a || 0))
                      .slice(0, 5)
                      .map(([candidate, score]: [string, any]) => (
                        <div key={candidate} style={{marginLeft: '1rem', marginTop: '0.25rem'}}>
                          {candidate}: {typeof score === 'number' ? score.toFixed(2) : score}
                        </div>
                      ))}
                  </div>
                )}
                
                <h3 style={{marginTop: '1rem'}}>Results by Method:</h3>
                {(() => {
                  // Define method families and their order
                  const methodFamilies = [
                    {
                      name: 'Condorcet',
                      methods: ['ranked_pairs', 'schulze']
                    },
                    {
                      name: 'Rating',
                      methods: ['score', 'approval']
                    },
                    {
                      name: 'Runoff',
                      methods: ['irv_stv', 'coombs']
                    }
                  ];

                  // Method name formatting
                  const formatMethodName = (method: string): string => {
                    const nameMap: {[key: string]: string} = {
                      'ranked_pairs': 'Ranked Pairs',
                      'schulze': 'Schulze',
                      'score': 'Score',
                      'approval': 'Approval',
                      'irv_stv': 'IRV/STV',
                      'coombs': 'Coombs'
                    };
                    return nameMap[method] || method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                  };

                  return methodFamilies.map((family, familyIdx) => {
                    const familyMethods: Array<[string, any]> = family.methods
                      .map(method => [method, ballotResult.results?.[method]] as [string, any])
                      .filter(([_, result]) => result !== undefined) as Array<[string, any]>;

                    if (familyMethods.length === 0) return null;

                    return (
                      <div key={family.name} style={{marginTop: familyIdx > 0 ? '1rem' : '0', marginBottom: '0.5rem'}}>
                        <h4 style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase'}}>{family.name} Methods</h4>
                        {familyMethods.map(([method, methodResult]: [string, any]) => {
                          const status = methodResult.status || 'unknown';
                          const isError = status === 'error' || methodResult.error;
                          const isNoVotes = status === 'no_votes';
                          const isConclusive = status === 'conclusive';
                          const isInconclusive = status === 'inconclusive';
                          
                          // Determine status color and label
                          // Algorithm status "conclusive" means the algorithm found enough winners
                          // But we need to check if election is closed to show "Final" vs "Conclusive"
                          let statusColor = '#666';
                          let statusLabel = status;
                          if (isError) {
                            statusColor = '#d32f2f';
                            statusLabel = 'Error';
                          } else if (isNoVotes) {
                            statusColor = '#999';
                            statusLabel = 'No Votes';
                          } else if (isConclusive) {
                            // "Final" only if election is closed, otherwise "Leading"
                            statusColor = '#2e7d32';
                            statusLabel = isClosed ? 'Final' : 'Leading';
                          } else if (isInconclusive) {
                            statusColor = '#ff9800';
                            statusLabel = 'Indeterminate';
                          } else {
                            statusColor = '#2196f3';
                            statusLabel = 'Unknown';
                          }
                          
                          return (
                            <div key={method} style={{marginTop: '0.5rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px', borderLeft: `3px solid ${statusColor}`}}>
                              <strong>{formatMethodName(method)}:</strong>
                              {methodResult.winners && methodResult.winners.length > 0 ? (
                                <span style={{marginLeft: '0.5rem'}}>
                                  {methodResult.winners.join(', ')}
                                </span>
                              ) : (
                                <span style={{marginLeft: '0.5rem', color: '#666', fontStyle: 'italic'}}>
                                  {isNoVotes ? 'No votes yet' : isError ? 'Calculation failed' : 'No winners determined'}
                                </span>
                              )}
                              <span style={{marginLeft: '0.5rem', fontSize: '0.9rem', color: statusColor, fontWeight: 'bold'}}>
                                [{statusLabel}]
                              </span>
                              {methodResult.error && (
                                <div style={{marginTop: '0.25rem', marginLeft: '1rem', fontSize: '0.85rem', color: '#d32f2f'}}>
                                  Error: {methodResult.error}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <p style={{marginTop: '1rem', color: '#666', fontStyle: 'italic'}}>
                No votes have been submitted for this ballot yet.
              </p>
            )}
          </div>
          </MuuriItem>
        );
      })}
        </MuuriComponent>
      </div>
    </div>
  );
}

export default function App() {
  const {ballots, currentElection, token, votes, confirmations} = useSelector((s: TotalState) => s.election);
  const location = useLocation();
  const navigate = useNavigate();
  const sessionToken = sessionStorage.getItem('vote_token');

  // Determine election status (before any early returns)
  const now = new Date();
  const votingEnd = currentElection?.voting_end ? new Date(currentElection.voting_end) : null;
  const votingStart = currentElection?.voting_start ? new Date(currentElection.voting_start) : null;
  const isClosed = votingEnd && now > votingEnd;
  const isOpen = votingStart && votingEnd && now >= votingStart && now <= votingEnd;
  const isUpcoming = votingStart && now < votingStart;

  // Build list of available tabs based on election status
  const availableTabs: Array<{path: string; label: string; element: React.ReactElement}> = [];
  
  // Results tab is always available
  availableTabs.push({path: '/results', label: 'Results', element: <ResultsView/>});
  
  // Summary and ballot tabs only available if election is open (NOT upcoming)
  if (isOpen && currentElection) {
    availableTabs.push({path: '/summary', label: 'Summary', element: <SummaryView/>});
    ballots.forEach((ballot: Ballot) => {
      availableTabs.push({
        path: `/ballot/${encodeURIComponent(ballot.title)}`,
        label: ballot.title,
        element: <BallotView/>
      });
    });
  }

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Sync sessionStorage token to Redux if present
  React.useEffect(() => {
    if (sessionToken && !token) {
      const viewToken = sessionStorage.getItem('view_token');
      const electionIdentifier = sessionStorage.getItem('election_identifier');
      
      if (electionIdentifier && viewToken) {
        // Load election details
        fetch(`/api/elections/${electionIdentifier}`)
          .then(res => res.json())
          .then(data => {
            if (data.ballots) {
              actions.election.initializeElection(
                {
                  identifier: data.identifier,
                  title: data.title,
                  description: data.description,
                  ballots: data.ballots,
                  voting_start: data.voting_start,
                  voting_end: data.voting_end,
                },
                sessionToken,
                viewToken
              );
            }
          })
          .catch(err => console.error('Failed to load election:', err));
      }
    }
  }, [sessionToken, token]);

  // Handle redirects - must be called unconditionally (Rules of Hooks)
  React.useEffect(() => {
    if (!sessionToken || !currentElection) return;
    
    if (availableTabs.length === 1) {
      // Single tab: redirect to it if not already there
      if (location.pathname !== availableTabs[0].path && !location.pathname.startsWith(availableTabs[0].path)) {
        navigate(availableTabs[0].path, {replace: true});
      }
    } else {
      // Multiple tabs: redirect invalid paths to first available tab
      const currentPath = location.pathname;
      const isValidPath = availableTabs.some(tab => {
        if (tab.path === '/summary' || tab.path === '/') {
          return currentPath === '/summary' || currentPath === '/';
        }
        if (tab.path.startsWith('/ballot/')) {
          return currentPath.startsWith('/ballot/');
        }
        return currentPath === tab.path;
      });
      
      if (!isValidPath) {
        // Redirect to first available tab (Results)
        navigate(availableTabs[0].path, {replace: true});
      }
    }
  }, [location.pathname, navigate, availableTabs.length, sessionToken, currentElection]);

  // If no token, show landing page (AFTER all hooks are called)
  if (!sessionToken || !currentElection) {
    return <LandingPage/>;
  }

  // If only one tab, render it directly without navbar
  if (availableTabs.length === 1) {
    return (
      <Layout>
        <CenterBody>
          <Routes>
            <Route path={availableTabs[0].path} element={availableTabs[0].element}/>
            <Route path="*" element={availableTabs[0].element}/>
          </Routes>
        </CenterBody>
      </Layout>
    );
  }

  return (
    <Layout>
      <Navbar>
        {availableTabs.map(tab => {
          // Skip individual ballot tabs from navbar (they're in the map below)
          if (tab.path.startsWith('/ballot/')) {
            return null;
          }
          
          const isActive = tab.path === '/summary' 
            ? (location.pathname === '/summary' || location.pathname === '/')
            : location.pathname === tab.path;
          
          return (
            <NavLink key={tab.path} to={tab.path} $active={isActive}>
              {tab.label}
            </NavLink>
          );
        })}
        {/* Individual ballot tabs (only if election is open, NOT upcoming) */}
        {isOpen && ballots.map((ballot: Ballot) => {
          const vote = votes[ballot.title];
          const isConfirmed = confirmations[ballot.title] || false;
          
          // Calculate completion: count candidates in score bands (0-5)
          const totalCandidates = ballot.candidates.length;
          let rankedCount = 0;
          if (vote) {
            for (let score = 0; score <= 5; score++) {
              rankedCount += (vote[score.toString()] || []).length;
            }
          }
          const allRanked = rankedCount === totalCandidates;
          const partiallyFilled = rankedCount > 0 && rankedCount < totalCandidates;
          
          return (
            <NavLink
              key={ballot.title}
              to={`/ballot/${encodeURIComponent(ballot.title)}`}
              $active={location.pathname.includes(`/ballot/${encodeURIComponent(ballot.title)}`)}
              style={{position: 'relative'}}
            >
              {ballot.title}
              <span style={{
                marginLeft: '0.5rem',
                display: 'inline-block',
                width: '1.5rem',
                textAlign: 'center',
                flexShrink: 0
              }}>
                {isConfirmed && (
                  <span style={{
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    background: '#4caf50',
                    borderRadius: '50%',
                    width: '1.2rem',
                    height: '1.2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    ✓
                  </span>
                )}
                {!isConfirmed && allRanked && (
                  <span style={{
                    color: '#a5d6a7',
                    fontSize: '1rem',
                    border: '2px solid #a5d6a7',
                    borderRadius: '50%',
                    width: '1.2rem',
                    height: '1.2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    background: '#c8e6c9'
                  }}>
                    ✓
                  </span>
                )}
                {!isConfirmed && partiallyFilled && (
                  <span style={{
                    fontSize: '0.75rem',
                    background: '#ff9800',
                    color: 'white',
                    padding: '0 0.3rem',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '1.2rem',
                    minWidth: '1.2rem'
                  }}>
                    {Math.round((rankedCount / totalCandidates) * 100)}%
                  </span>
                )}
              </span>
            </NavLink>
          );
        })}
      </Navbar>
      <CenterBody>
        <Routes>
          <Route path="/" element={<SummaryView/>}/>
          <Route path="/results" element={<ResultsView/>}/>
          <Route path="/summary" element={<SummaryView/>}/>
          <Route path="/ballot/:title" element={<BallotView/>}/>
        </Routes>
      </CenterBody>
    </Layout>
  );
}

