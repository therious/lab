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
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const ElectionSummaryCard = styled(Link)`
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const ElectionTitle = styled.h2`
  margin: 0 0 0.5rem 0;
`;

const VoteStatus = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const VoteDetails = styled.div`
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #555;
`;

const ScoreBreakdown = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ScoreBadge = styled.span<{$color: string}>`
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.$color}33;
  border: 1px solid ${props => props.$color};
  border-radius: 4px;
  font-size: 0.75rem;
`;

function SummaryView() {
  const {elections, votes} = useSelector<TotalState>(s => s.election);

  const BAND_LABELS: Record<string, string> = {
    '5': 'Excellent',
    '4': 'Good',
    '3': 'Mediocre',
    '2': 'Bad',
    '1': 'Very Bad',
    '0': 'Unqualified',
  };

  const BAND_COLORS: Record<string, string> = {
    '5': '#4caf50',
    '4': '#8bc34a',
    '3': '#ffeb3b',
    '2': '#ff9800',
    '1': '#ff6b6b',
    '0': '#f44336',
  };

  return (
    <SummaryContainer>
      <h1>Election Summary</h1>
      {elections.map(election => {
        const vote = votes[election.title];
        if (!vote) return null;
        
        const totalRanked = Object.keys(vote)
          .filter(key => key !== 'unranked')
          .reduce((sum, key) => sum + (vote[key]?.length || 0), 0);
        const unrankedCount = vote.unranked?.length || 0;
        
        return (
          <ElectionSummaryCard key={election.title} to={`/election/${encodeURIComponent(election.title)}`}>
            <ElectionTitle>{election.title}</ElectionTitle>
            <VoteStatus>
              {totalRanked > 0 ? `${totalRanked} candidates ranked` : 'No votes yet'}
              {unrankedCount > 0 && ` • ${unrankedCount} unranked`}
            </VoteStatus>
            {totalRanked > 0 && (
              <VoteDetails>
                <ScoreBreakdown>
                  {['5', '4', '3', '2', '1', '0'].map(score => {
                    const count = vote[score]?.length || 0;
                    if (count === 0) return null;
                    return (
                      <ScoreBadge key={score} $color={BAND_COLORS[score]}>
                        {score}: {BAND_LABELS[score]} ({count})
                      </ScoreBadge>
                    );
                  })}
                </ScoreBreakdown>
              </VoteDetails>
            )}
          </ElectionSummaryCard>
        );
      })}
    </SummaryContainer>
  );
}

function ElectionView() {
  const location = useLocation();
  const electionTitle = decodeURIComponent(location.pathname.split('/election/')[1] || '');
  const {elections} = useSelector<TotalState>(s => s.election);
  const election = elections.find(e => e.title === electionTitle);

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
  const {elections} = useSelector<TotalState>(s => s.election);
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
        {elections.map(election => (
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

