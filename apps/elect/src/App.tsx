import {useEffect} from 'react';
import {Routes, Route, Link, useLocation} from 'react-router-dom';
import {useSelector} from './actions-integration';
import {actions} from './actions-integration';
import {TotalState} from './actions/combined-slices';
import {Election} from './actions/election-slice';
import {VotingInterface} from './components/VotingInterface';
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

function SummaryView() {
  const {elections, votes} = useSelector((s: TotalState) => s.election);

  const BAND_CONFIG = [
    { score: '5', label: 'Excellent', color: '#2e7d32' },
    { score: '4', label: 'Good', color: '#8bc34a' },
    { score: '3', label: 'Mediocre', color: '#ffeb3b' },
    { score: '2', label: 'Bad', color: '#ff9800' },
    { score: '1', label: 'Very Bad', color: '#ff6b6b' },
    { score: '0', label: 'Unqualified/Unacceptable', color: '#444444' },
    { score: 'unranked', label: 'Unranked', color: '#90caf9' },
  ];

  return (
    <SummaryContainer>
      <h1>Election Summary</h1>
      {elections.map((election: Election) => {
        const vote = votes[election.title];
        if (!vote) return null;
        
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
          <ElectionSummaryCard key={election.title} to={`/election/${encodeURIComponent(election.title)}`}>
            <ElectionTitle>{election.title}</ElectionTitle>
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
          </ElectionSummaryCard>
        );
      })}
    </SummaryContainer>
  );
}

function ElectionView() {
  const location = useLocation();
  const electionTitle = decodeURIComponent(location.pathname.split('/election/')[1] || '');
  const {elections} = useSelector((s: TotalState) => s.election);
  const election = elections.find((e: Election) => e.title === electionTitle);

  if (!election) {
    return <div>Election not found</div>;
  }

  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <h1 style={{padding: '1rem', margin: 0, borderBottom: '1px solid #ccc'}}>{election.title}</h1>
      <div style={{flex: 1, minHeight: 0}}>
        <VotingInterface electionTitle={electionTitle}/>
      </div>
    </div>
  );
}

export default function App() {
  const {elections} = useSelector((s: TotalState) => s.election);
  const location = useLocation();

  useEffect(() => {
    // Initialize elections from config if not already loaded
    if (elections.length === 0) {
      // This will be loaded from config in the main entry point
      // For now, we'll need to pass it through config or load it separately
    }
  }, [elections.length]);

  return (
    <Layout>
      <Navbar>
        <NavLink to="/summary" $active={location.pathname === '/summary' || location.pathname === '/'}>
          Summary
        </NavLink>
        {elections.map((election: Election) => (
          <NavLink
            key={election.title}
            to={`/election/${encodeURIComponent(election.title)}`}
            $active={location.pathname.includes(`/election/${encodeURIComponent(election.title)}`)}
          >
            {election.title}
          </NavLink>
        ))}
      </Navbar>
      <CenterBody>
        <Routes>
          <Route path="/" element={<SummaryView/>}/>
          <Route path="/summary" element={<SummaryView/>}/>
          <Route path="/election/:title" element={<ElectionView/>}/>
        </Routes>
      </CenterBody>
    </Layout>
  );
}

