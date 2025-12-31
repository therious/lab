import React, {useEffect} from 'react';
import {Routes, Route, Link, useLocation} from 'react-router-dom';
import {useSelector} from './actions-integration';
import {actions} from './actions-integration';
import {TotalState} from './actions/combined-slices';
import {Ballot} from './actions/election-slice';
import {VotingInterface} from './components/VotingInterface';
import {LandingPage} from './components/LandingPage';
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

const ConfirmButton = styled.button<{$confirmed: boolean}>`
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
`;

function SummaryView() {
  const {ballots, votes, confirmations, currentElection, token} = useSelector((s: TotalState) => s.election);

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
        alert('Vote submitted successfully!');
        // Could navigate to a confirmation page
      } else {
        alert(`Error: ${data.error || 'Failed to submit vote'}`);
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      alert('An error occurred while submitting your vote.');
    }
  };

  return (
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
          <div key={ballot.title} style={{border: '2px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem'}}>
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
            <ConfirmButton
              $confirmed={isConfirmed}
              onClick={() => actions.election.confirmBallot(ballot.title)}
              disabled={isConfirmed}
            >
              {isConfirmed ? '✓ Confirmed' : 'Confirm This Ballot'}
            </ConfirmButton>
          </div>
        );
      })}
      {ballots.length > 0 && (
        <SubmitButton $enabled={allConfirmed} onClick={handleSubmit} disabled={!allConfirmed}>
          {allConfirmed ? 'Submit All Votes' : `Confirm ${ballots.length - Object.values(confirmations).filter(Boolean).length} more ballot(s) to submit`}
        </SubmitButton>
      )}
    </SummaryContainer>
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

  if (!currentElection) {
    return <div>No election selected</div>;
  }

  return (
    <div style={{padding: '2rem'}}>
      <h1>Election Results: {currentElection.title}</h1>
      <p style={{color: '#666', fontSize: '1.1rem'}}>
        Results are being calculated. This election is currently in progress.
      </p>
      <p style={{color: '#999', fontSize: '0.9rem', marginTop: '1rem'}}>
        Detailed results and visualizations will be available after the voting period ends.
      </p>
    </div>
  );
}

export default function App() {
  const {ballots, currentElection, token} = useSelector((s: TotalState) => s.election);
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
        {ballots.map((ballot: Ballot) => (
          <NavLink
            key={ballot.title}
            to={`/ballot/${encodeURIComponent(ballot.title)}`}
            $active={location.pathname.includes(`/ballot/${encodeURIComponent(ballot.title)}`)}
          >
            {ballot.title}
          </NavLink>
        ))}
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

