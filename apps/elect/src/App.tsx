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
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
  overflow-y: auto;
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
  flex: 1;
  min-height: 0;
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
  flex: 1;
  align-items: center;
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

const ConfirmButton = styled.button.attrs<{$confirmed: boolean}>(() => ({type: 'button'}))<{$confirmed: boolean}>`
  padding: 0.5rem 1rem;
  background: ${props => props.$confirmed ? '#4caf50' : '#2196f3'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 0.5rem;

  &:hover:not(:disabled) {
    background: ${props => props.$confirmed ? '#45a049' : '#1976d2'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    
    &:hover {
      background: ${props => props.$confirmed ? '#4caf50' : '#2196f3'};
    }
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

  const BAND_CONFIG = [
    { score: '5', label: 'Excellent', color: '#2e7d32' },
    { score: '4', label: 'Good', color: '#8bc34a' },
    { score: '3', label: 'Mediocre', color: '#ffeb3b' },
    { score: '2', label: 'Bad', color: '#ff9800' },
    { score: '1', label: 'Very Bad', color: '#ff6b6b' },
    { score: '0', label: 'Unqualified/Unacceptable', color: '#444444' },
    { score: 'unranked', label: 'Unranked', color: '#90caf9' },
  ];

  const allConfirmed = ballots.length > 0 && ballots.every(ballot => confirmations[ballot.title]);

  const handleSubmit = async () => {
    if (!currentElection || !token) {
      alert('Missing election or token information');
      return;
    }

    // Check if token is a preview token
    if (token.startsWith('preview-')) {
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
        setSubmissionError(data.error || 'An unexpected error occurred while submitting your vote. Please try again.');
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
        <h1>{currentElection?.title || 'Election Summary'}</h1>
      {ballots.map((ballot: Ballot) => {
        const vote = votes[ballot.title];
        if (!vote) return null;
        
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
        
        return (
          <div 
            key={ballot.title} 
            style={{border: '2px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', cursor: 'pointer'}}
            onClick={() => {
              const encodedTitle = encodeURIComponent(ballot.title);
              navigate(`/ballot/${encodedTitle}`);
            }}
          >
            <ElectionTitle>{ballot.title}</ElectionTitle>
            {ballot.description && <p style={{color: '#666', fontSize: '0.9rem', margin: '0.5rem 0'}}>{ballot.description}</p>}
            <BandsContainer>
              {BAND_CONFIG.map(({score, label, color}) => {
                const candidates = vote[score] || [];
                if (candidates.length === 0) return null;
                
                return (
                  <BandRow key={score} $color={color}>
                    <BandLabel>{label}</BandLabel>
                    <CandidatesList>
                      {candidates.map((candidateName: string, index: number) => (
                        <CandidateName key={`${score}-${candidateName}-${index}`}>
                          {score === 'unranked' ? (
                            <RankBadge>NR</RankBadge>
                          ) : (
                            candidateRanks[candidateName] && <RankBadge>{candidateRanks[candidateName]}</RankBadge>
                          )}
                          {candidateName}
                        </CandidateName>
                      ))}
                    </CandidatesList>
                  </BandRow>
                );
              })}
            </BandsContainer>
            {!submitted && (isConfirmed ? (
              <ConfirmButton
                $confirmed={true}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  actions.election.unconfirmBallot(ballot.title);
                }}
              >
                ✓ Confirmed (Click to Undo)
              </ConfirmButton>
            ) : (
              <ConfirmButton
                $confirmed={false}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  actions.election.confirmBallot(ballot.title);
                }}
              >
                Confirm This Ballot
              </ConfirmButton>
            ))}
          </div>
        );
      })}
      {ballots.length > 0 && !submitted && (
        <SubmitButton 
          $enabled={allConfirmed && !token?.startsWith('preview-')} 
          onClick={handleSubmit} 
          disabled={!allConfirmed || token?.startsWith('preview-')}
        >
          {token?.startsWith('preview-') 
            ? 'Preview Mode - Voting Not Yet Open' 
            : allConfirmed 
              ? 'Submit All Votes' 
              : `Confirm ${ballots.length - Object.values(confirmations).filter(Boolean).length} more ballot(s) to submit`}
        </SubmitButton>
      )}
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

  React.useEffect(() => {
    if (currentElection) {
      setLoading(true);
      setError(null);
      fetch(`/api/dashboard/${currentElection.identifier}`, {
        headers: {
          'Accept': 'application/json'
        }
      })
        .then(async res => {
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            // Server returned HTML error page instead of JSON
            const text = await res.text();
            const titleMatch = text.match(/<title>(.*?)<\/title>/i);
            const errorTitle = titleMatch ? titleMatch[1] : 'Server Error';
            throw new Error(`Server returned HTML instead of JSON: ${errorTitle}`);
          }
          
          const data = await res.json();
          // Even if response is not OK, try to extract partial results if available
          if (!res.ok) {
            // If we have partial results, use them; otherwise throw error
            if (data.results || data.results?.results) {
              return data;
            }
            throw new Error(data.error || data.error_message || 'Failed to load results');
          }
          return data;
        })
        .then(data => {
          // Handle both old format (array) and new format (object with results and metadata)
          if (data.results && Array.isArray(data.results)) {
            // Old format: results is array, metadata might be separate
            setResults({ballots: data.results, metadata: data.metadata || null});
          } else if (data.results && data.results.results && Array.isArray(data.results.results)) {
            // New format: results.results is array, results.metadata exists
            setResults({ballots: data.results.results, metadata: data.results.metadata || null});
          } else if (data.results && typeof data.results === 'object' && data.results.results) {
            // New format with metadata
            setResults({ballots: data.results.results || [], metadata: data.results.metadata || null});
          } else {
            // Fallback
            setResults({ballots: data.results || [], metadata: data.metadata || null});
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading results:', err);
          setError(err.message || 'Failed to load results');
          setLoading(false);
        });
    }
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
        <p style={{color: '#c33'}}>Error: {error}</p>
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
          <div style={{marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px'}}>
            <p><strong>Total Votes:</strong> {metadata.total_votes || 0}</p>
            {metadata.voting_end && (
              <p><strong>Voting Ends:</strong> {new Date(metadata.voting_end).toLocaleString()}</p>
            )}
          </div>
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
      <h1>Election Results: {currentElection.title}</h1>
      {error && (
        <div style={{marginBottom: '1rem', padding: '0.75rem', background: '#ffebee', border: '1px solid #d32f2f', borderRadius: '4px', color: '#c62828'}}>
          <strong>Warning:</strong> {error} (Showing partial results below)
        </div>
      )}
      {metadata && (
        <>
          <div style={{marginBottom: '2rem', padding: '1rem', background: '#e8f4f8', borderRadius: '8px'}}>
            <p><strong>Total Votes Submitted:</strong> {metadata.total_votes || 0}</p>
            {votingStart && (
              <p><strong>Voting Started:</strong> {votingStart.toLocaleString()}</p>
            )}
            {votingEnd && (
              <p><strong>Voting {isClosed ? 'Ended' : 'Ends'}:</strong> {votingEnd.toLocaleString()}</p>
            )}
            <p><strong>Status:</strong> 
              <span style={{marginLeft: '0.5rem', fontWeight: 'bold', color: isClosed ? '#d32f2f' : isOpen ? '#2e7d32' : '#ff9800'}}>
                {isClosed ? 'Closed' : isOpen ? 'Open' : isUpcoming ? 'Upcoming' : 'Unknown'}
              </span>
            </p>
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
      {ballots.map((ballotResult: any, idx: number) => {
        const voteCount = ballotResult.vote_count || 0;
        const hasVotes = voteCount > 0;
        
        return (
          <div key={idx} style={{marginBottom: '2rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '8px'}}>
            <h2>{ballotResult.ballot_title}</h2>
            <p><strong>Vote Count:</strong> {voteCount} {voteCount === 1 ? 'vote' : 'votes'}</p>
            <p><strong>Number of Winners:</strong> {ballotResult.number_of_winners}</p>
            
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
                {Object.entries(ballotResult.results || {}).map(([method, methodResult]: [string, any]) => {
                  const status = methodResult.status || 'unknown';
                  const isError = status === 'error' || methodResult.error;
                  const isNoVotes = status === 'no_votes';
                  const isConclusive = status === 'conclusive';
                  const isInconclusive = status === 'inconclusive';
                  
                  // Determine status color and label
                  let statusColor = '#666';
                  let statusLabel = status;
                  if (isError) {
                    statusColor = '#d32f2f';
                    statusLabel = 'Error';
                  } else if (isNoVotes) {
                    statusColor = '#999';
                    statusLabel = 'No Votes';
                  } else if (isConclusive) {
                    statusColor = '#2e7d32';
                    statusLabel = 'Final';
                  } else if (isInconclusive) {
                    statusColor = '#ff9800';
                    statusLabel = 'Indeterminate';
                  } else {
                    statusColor = '#2196f3';
                    statusLabel = 'Intermediate';
                  }
                  
                  return (
                    <div key={method} style={{marginTop: '0.5rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px', borderLeft: `3px solid ${statusColor}`}}>
                      <strong>{method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}:</strong>
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
            ) : (
              <p style={{marginTop: '1rem', color: '#666', fontStyle: 'italic'}}>
                No votes have been submitted for this ballot yet.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const {ballots, currentElection, token, votes, confirmations} = useSelector((s: TotalState) => s.election);
  const location = useLocation();
  const sessionToken = sessionStorage.getItem('vote_token');

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

  // If no token, show landing page
  if (!sessionToken || !currentElection) {
    return <LandingPage/>;
  }

  return (
    <Layout>
      <Navbar>
        <NavLink to="/results" $active={location.pathname === '/results'}>
          Results
        </NavLink>
        <NavLink to="/summary" $active={location.pathname === '/summary' || location.pathname === '/'}>
          Summary
        </NavLink>
        {ballots.map((ballot: Ballot) => {
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
          const nothingRanked = rankedCount === 0;
          
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
                    color: '#666',
                    fontSize: '1rem',
                    border: '2px solid #666',
                    borderRadius: '50%',
                    width: '1.2rem',
                    height: '1.2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    background: '#4caf50'
                  }}>
                    ✓
                  </span>
                )}
                {!isConfirmed && partiallyFilled && (
                  <span style={{
                    fontSize: '0.75rem',
                    background: '#ff9800',
                    color: 'white',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    display: 'inline-block'
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

