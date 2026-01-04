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
import {UserProfile} from './components/UserProfile';
import {BuildInfo} from './components/BuildInfo';

export default function App() {
  const {ballots, currentElection, token, viewToken, votes, confirmations, submitted, userEmail, electionIdentifier} = useSelector((s: TotalState) => s.election);
  const location = useLocation();
  const navigate = useNavigate();
  const [serverBuildInfo, setServerBuildInfo] = React.useState<any>(null);
  const [isRestoring, setIsRestoring] = React.useState(false);

  // Fetch server build info immediately (before login)
  React.useEffect(() => {
    fetch("/api/build-info")
      .then(res => res.json())
      .then(data => {
        if (data.commitHash) {
          setServerBuildInfo(data);
        }
      })
      .catch(err => {
        console.warn("Could not fetch server build info:", err);
      });
  }, []); // Run once on mount

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
  // Note: Session-persisted state (token, viewToken, electionIdentifier, userEmail, submitted)
  // is restored from sessionStorage at slice initialization, not through discrete actions.
  // We only need to validate token status with server and restore election if needed.

  // Initialize election if we have session-persisted state but no current election
  // Also validate token status with server to get authoritative vote status
  React.useEffect(() => {
    // Session-persisted state is already in Redux from slice initialization
    // We just need to load the election if we have the identifier but no election object
    if (electionIdentifier && !currentElection && token) {
      setIsRestoring(true);
      
      // First, validate token status with server (authoritative source)
      const validateToken = fetch('/api/tokens/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          election_identifier: electionIdentifier,
          token: token
        })
      })
        .then(async res => {
          if (!res.ok) {
            console.warn('Token validation failed, but continuing with restoration');
            return null;
          }
          return res.json();
        })
        .catch(err => {
          console.warn('Token validation error:', err);
          return null;
        });
      
      // Load election details
      const loadElection = fetch(`/api/elections/${electionIdentifier}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then(async res => {
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            throw new Error(`Server returned HTML instead of JSON: ${text.substring(0, 100)}`);
          }
          return res.json();
        });
      
      // Wait for both to complete
      Promise.all([validateToken, loadElection])
        .then(([tokenStatus, electionData]) => {
          // Initialize election (middleware will persist to sessionStorage)
          if (electionData.election && electionData.election.ballots) {
            actions.election.initializeElection(electionData.election, token, viewToken || '');
          } else if (electionData.ballots) {
            actions.election.initializeElection(
              {
                identifier: electionIdentifier,
                title: electionData.title || electionIdentifier,
                description: electionData.description,
                ballots: electionData.ballots,
                voting_start: electionData.voting_start,
                voting_end: electionData.voting_end,
              },
              token,
              viewToken || ''
            );
          }
          
          // Update submitted status based on server token validation (authoritative)
          if (tokenStatus && tokenStatus.used) {
            actions.election.markSubmitted(); // This will also persist to sessionStorage
          }
          
          setIsRestoring(false);
        })
        .catch(err => {
          console.error('Failed to load election:', err);
          setIsRestoring(false);
        });
    } else if (!electionIdentifier || !token) {
      setIsRestoring(false);
    } else {
      setIsRestoring(false);
    }
  }, [electionIdentifier, currentElection, token, viewToken]);

  // Handle redirects - must be called unconditionally (Rules of Hooks)
  React.useEffect(() => {
    if (!token || !currentElection) return;
    
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
  }, [location.pathname, navigate, availableTabs.length, token, currentElection]);

  // If no token and not restoring, show landing page (AFTER all hooks are called)
  // Wait for restoration to complete before showing landing page
  if (!token && !isRestoring) {
    return <LandingPage/>;
  }
  
  // If we have a token but no election yet, wait for restoration (show loading or nothing)
  if (token && !currentElection && isRestoring) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div>;
  }
  
  // If restoration failed or no token after restoration attempt
  if (!currentElection && !isRestoring) {
    return <LandingPage/>;
  }

  // If only one tab, render it directly without navbar (but show UserProfile)
  if (availableTabs.length === 1) {
    const singleTab = availableTabs[0];
    let element: React.ReactElement;
    if (singleTab.path === '/results') {
      element = <ResultsView setServerCommitHash={(hash) => { 
        if (hash && !serverBuildInfo) {
          // Fetch full server build info when hash is provided
          fetch("/api/build-info")
            .then(res => res.json())
            .then(data => {
              if (data.commitHash) {
                setServerBuildInfo(data);
              }
            })
            .catch(() => {});
        }
      }} />;
    } else if (singleTab.path === '/summary') {
      element = <SummaryView/>;
    } else if (singleTab.path.startsWith('/ballot/')) {
      element = <BallotView/>;
    } else {
      element = <ResultsView setServerCommitHash={(hash) => { 
        if (hash && !serverBuildInfo) {
          fetch("/api/build-info")
            .then(res => res.json())
            .then(data => {
              if (data.commitHash) {
                setServerBuildInfo(data);
              }
            })
            .catch(() => {});
        }
      }} />; // fallback
    }
    
    return (
      <Layout>
        {/* Show UserProfile in same position as Navbar when tabs are hidden */}
        <Navbar style={{justifyContent: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          <BuildInfo serverBuildInfo={serverBuildInfo} />
          <UserProfile email={userEmail} hasVoted={submitted} />
        </Navbar>
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
      <Navbar style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
        {availableTabs.map((tab) => {
          // Determine if this specific tab is active
          let isActive = false;
          if (tab.path === '/summary' || tab.path === '/') {
            // Summary tab is active if pathname is '/' or '/summary'
            isActive = location.pathname === '/' || location.pathname === '/summary';
          } else if (tab.path.startsWith('/ballot/')) {
            // Ballot tab is active only if pathname exactly matches this ballot path
            isActive = location.pathname === tab.path;
          } else {
            // Results or other tabs - exact match
            isActive = location.pathname === tab.path;
          }
          
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
              // Count ranked candidates (exclude 'unranked' key)
              const rankedCount = Object.entries(vote)
                .filter(([key]) => key !== 'unranked')
                .reduce((sum: number, [, arr]) => {
                  return sum + (Array.isArray(arr) ? arr.length : 0);
                }, 0);
              const partiallyFilled = rankedCount > 0 && rankedCount < totalCandidates;
              
              if (rankedCount === totalCandidates) {
                // All ranked but not confirmed - show round badge: grey checkmark, grey border, pale green interior
                badge = (
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    border: '2px solid #999',
                    color: '#999',
                    padding: '0',
                    borderRadius: '50%',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '1.2rem',
                    width: '1.2rem',
                    background: '#a5d6a7'
                  }}>
                    ✓
                  </span>
                );
              } else if (partiallyFilled) {
                // Partially filled - show percentage
                badge = (
                  <span style={{
                    marginLeft: '0.5rem',
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
        <BuildInfo serverBuildInfo={serverBuildInfo} />
        <UserProfile email={userEmail} hasVoted={submitted} />
      </Navbar>
      <CenterBody>
        <Routes>
          <Route path="/" element={<SummaryView/>}/>
          <Route path="/results" element={<ResultsView setServerCommitHash={(hash) => { 
            if (hash && !serverBuildInfo) {
              fetch("/api/build-info")
                .then(res => res.json())
                .then(data => {
                  if (data.commitHash) {
                    setServerBuildInfo(data);
                  }
                })
                .catch(() => {});
            }
          }} />}/>
          <Route path="/summary" element={<SummaryView/>}/>
          <Route path="/ballot/:title" element={<BallotView/>}/>
        </Routes>
      </CenterBody>
    </Layout>
  );
}
