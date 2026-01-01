import React from 'react';
import {Routes, Route, useLocation, useNavigate} from 'react-router-dom';
import {useSelector} from './actions-integration';
import {actions} from './actions-integration';
import {TotalState} from './actions/combined-slices';
import {Ballot} from './actions/election-slice';
import {LandingPage} from './components/LandingPage';
import {SummaryView} from './components/SummaryView';
import {BallotView} from './components/BallotView';
import {ResultsView} from './components/ResultsView';
import {Layout, Navbar, NavLink, CenterBody} from './components/Layout';

export default function App() {
  const {ballots, currentElection, token, votes, confirmations, submitted} = useSelector((s: TotalState) => s.election);
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

  // Build list of available tabs based on election status (paths only, no elements)
  const availableTabs: Array<{path: string; label: string}> = [];
  
  // Results tab is always available
  availableTabs.push({path: '/results', label: 'Results'});
  
  // Summary and ballot tabs only available if election is open (NOT upcoming)
  if (isOpen && currentElection) {
    availableTabs.push({path: '/summary', label: 'Summary'});
    ballots.forEach((ballot: Ballot) => {
      availableTabs.push({
        path: `/ballot/${encodeURIComponent(ballot.title)}`,
        label: ballot.title
      });
    });
  }

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Sync sessionStorage token to Redux if present
  React.useEffect(() => {
    if (sessionToken && !token) {
      // Token exists in sessionStorage but not in Redux - restore it
      actions.election.setToken(sessionToken);
    }
  }, [sessionToken, token]);

  // Initialize election if we have a token but no current election
  React.useEffect(() => {
    if (sessionToken && !currentElection) {
      const viewToken = sessionStorage.getItem('view_token');
      // Try to load election from token
      fetch('/api/tokens/validate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token: sessionToken})
      })
        .then(res => res.json())
        .then(data => {
          if (data.election) {
            actions.election.initializeElection(data.election, sessionToken, viewToken || '');
          }
        })
        .catch(err => console.error('Failed to load election:', err));
    }
  }, [sessionToken, currentElection]);

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
    const singleTab = availableTabs[0];
    let element: React.ReactElement;
    if (singleTab.path === '/results') {
      element = <ResultsView/>;
    } else if (singleTab.path === '/summary') {
      element = <SummaryView/>;
    } else if (singleTab.path.startsWith('/ballot/')) {
      element = <BallotView/>;
    } else {
      element = <ResultsView/>; // fallback
    }
    
    return (
      <Layout>
        <CenterBody>
          <Routes>
            <Route path={singleTab.path} element={element}/>
            <Route path="*" element={element}/>
          </Routes>
        </CenterBody>
      </Layout>
    );
  }

  return (
    <Layout>
      <Navbar>
        {availableTabs.map((tab) => {
          const isActive = location.pathname === tab.path || 
            (tab.path === '/summary' && location.pathname === '/') ||
            (tab.path.startsWith('/ballot/') && location.pathname.startsWith('/ballot/'));
          
          // For ballot tabs, show confirmation badge
          let badge = null;
          if (tab.path.startsWith('/ballot/')) {
            const ballotTitle = decodeURIComponent(tab.path.split('/ballot/')[1]);
            const vote = votes[ballotTitle];
            const isConfirmed = confirmations[ballotTitle] || false;
            
            if (submitted) {
              // Show green checkmark when submitted
              badge = (
                <span style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.75rem',
                  background: '#4caf50',
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
                  ✓
                </span>
              );
            } else if (isConfirmed) {
              // Show green checkmark when confirmed
              badge = (
                <span style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.75rem',
                  background: '#4caf50',
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
                  ✓
                </span>
              );
            } else if (vote) {
              // Check if all candidates are ranked
              const totalCandidates = currentElection?.ballots?.find(b => b.title === ballotTitle)?.candidates?.length || 0;
              const rankedCount = Object.values(vote).flat().filter((arr: any) => Array.isArray(arr)).reduce((sum: number, arr: any) => sum + arr.length, 0) - (vote.unranked?.length || 0);
              const partiallyFilled = rankedCount > 0 && rankedCount < totalCandidates;
              
              if (rankedCount === totalCandidates) {
                // All ranked but not confirmed - show pastel green check
                badge = (
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    border: '2px solid #a5d6a7',
                    color: '#a5d6a7',
                    padding: '0 0.3rem',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '1.2rem',
                    minWidth: '1.2rem',
                    background: 'transparent'
                  }}>
                    ✓
                  </span>
                );
              } else if (partiallyFilled) {
                // Partially filled - show percentage
                badge = (
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
                );
              }
            }
          }
          
          return (
            <NavLink key={tab.path} to={tab.path} $active={isActive}>
              {tab.label}
              {badge}
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
