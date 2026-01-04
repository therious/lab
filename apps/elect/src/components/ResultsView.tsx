import React, {useState} from 'react';
import {useSelector} from '../actions-integration';
import {TotalState} from '../actions/combined-slices';
import {MuuriComponent} from 'muuri-react';
import {VoteTimeline} from './VoteTimeline';
import {MuuriItem} from './Layout';
import {METHOD_FAMILIES} from './constants';
import {formatMethodName, formatWinnersWithOrdering, getStatusColorAndLabel} from './utils';
// Format numbers with comma grouping for thousands (e.g., 1234 -> "1,234")
// Use this for all vote counts, quorum numbers, and any voting-related numbers
const formatVoteCount = (count: number | null | undefined): string => {
  if (count === null || count === undefined) return '0';
  return count.toLocaleString('en-US');
};

// Debug logging control - check localStorage or URL parameter
const DEBUG_LOGGING = (() => {
  if (typeof window !== 'undefined') {
    // Check URL parameter first (e.g., ?debug=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') return true;
    // Then check localStorage
    const stored = localStorage.getItem('elections:debug');
    if (stored === 'true') return true;
  }
  return false;
})();

// Helper to conditionally log debug messages
const debugLog = (...args: any[]) => {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
};

const debugWarn = (...args: any[]) => {
  if (DEBUG_LOGGING) {
    console.warn(...args);
  }
};

export function ResultsView({setServerCommitHash}: {setServerCommitHash?: (hash: string | null) => void} = {}) {
  const {currentElection} = useSelector((s: TotalState) => s.election);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date()); // For periodic relative time updates
  
  // Use refs to avoid stale closures in polling interval
  const errorRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    errorRef.current = error;
  }, [error]);

  // Polling interval for fallback updates (1 second)
  const POLL_INTERVAL_MS = 1000;
  
  // Update current time every second to refresh relative time display
  React.useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, []);
  
  // Load initial results and set up websocket connection
  React.useEffect(() => {
    if (!currentElection) return;
    
    setLoading(true);
    setError(null);
    
    // Set up polling as fallback for regular updates
    let pollInterval: NodeJS.Timeout | null = null;
    
    // Helper to process and set results
    const processResults = (data: any) => {
      debugLog('[DEBUG] Raw data received:', data);
      debugLog('[DEBUG] Data structure:', {
        hasResults: !!data.results,
        resultsType: typeof data.results,
        resultsIsArray: Array.isArray(data.results),
        resultsKeys: data.results ? Object.keys(data.results) : [],
        nestedResults: data.results?.results ? (Array.isArray(data.results.results) ? `array[${data.results.results.length}]` : typeof data.results.results) : 'none',
        metadata: data.results?.metadata ? {
          total_votes: data.results.metadata.total_votes,
          hasTimestamps: !!data.results.metadata.vote_timestamps
        } : 'none'
      });
      
      // API returns: {election_identifier: "...", results: {results: [...], metadata: {...}}}
      // WebSocket returns: {election_id: "...", results: {results: [...], metadata: {...}}}
      // Extract the nested results structure
      let ballots: any[] = [];
      let metadata: any = null;
      
      if (data.results) {
        // Check if results is the nested object with results and metadata
        if (data.results.results && Array.isArray(data.results.results)) {
          ballots = data.results.results;
          metadata = data.results.metadata || null;
          debugLog('[DEBUG] Using nested structure - ballots:', ballots.length, 'metadata.total_votes:', metadata?.total_votes);
        } 
        // Check if results is directly an array (old format)
        else if (Array.isArray(data.results)) {
          ballots = data.results;
          metadata = data.metadata || null;
          debugLog('[DEBUG] Using array format - ballots:', ballots.length);
        }
        // Check if results is an object with a results property
        else if (typeof data.results === 'object' && data.results.results) {
          ballots = Array.isArray(data.results.results) ? data.results.results : [];
          metadata = data.results.metadata || null;
          debugLog('[DEBUG] Using object.results format - ballots:', ballots.length, 'metadata.total_votes:', metadata?.total_votes);
        } else {
          debugWarn('[DEBUG] Unexpected results structure:', data.results);
        }
      } else {
        debugWarn('[DEBUG] No results in data:', data);
      }
      
      debugLog('[DEBUG] Final processed - ballots:', ballots.length, 'metadata.total_votes:', metadata?.total_votes);
      
      // Only update if we have valid data
      if (metadata !== null || ballots.length > 0) {
        setResults({ballots, metadata});
        setLastUpdateTime(new Date());
      } else {
        debugWarn('[DEBUG] Skipping update - no valid data');
      }
      setLoading(false);
    };
    
    // Helper to fetch results
    const fetchResults = async () => {
      return fetch(`/api/dashboard/${currentElection.identifier}`, {
        headers: {
          'Accept': 'application/json'
        }
      }).then(async res => {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          const errorTitle = titleMatch ? titleMatch[1] : 'Server Error';
          throw new Error(`Server returned HTML instead of JSON: ${errorTitle}`);
        }
        
        const data = await res.json();
        debugLog('[ResultsView] API response status:', res.status);
        debugLog('[ResultsView] Total votes in response:', data.results?.metadata?.total_votes || 'unknown');
        
        // Extract server build info (commit hash) if present
        if (data.buildInfo?.commitHash) {
          setServerCommitHash?.(data.buildInfo.commitHash);
        }
        
        if (!res.ok) {
          // If we have results despite error status, still try to process them
          if (data.results || data.results?.results) {
            debugLog('[DEBUG] API returned error but has results, processing anyway');
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
    };
    
    // Load initial results via REST API
    debugLog('[ResultsView] Loading results for election:', currentElection.identifier);
    fetchResults();
    
    // Set up polling for regular updates (fallback if WebSocket is slow)
    // Poll every second to ensure at least once-per-second updates
    pollInterval = setInterval(() => {
      // Poll regardless of loading state to ensure regular updates
      // Only skip if we have an error (don't spam on errors)
      if (!errorRef.current) {
        debugLog('[ResultsView] Polling for results update');
        fetchResults().catch(err => {
          debugWarn('[ResultsView] Poll error:', err);
        });
      }
    }, POLL_INTERVAL_MS);
    
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
        debugLog('[WebSocket] Received results_updated event:', payload);
        debugLog('[WebSocket] Payload structure:', {
          hasElectionId: !!payload.election_id,
          hasResults: !!payload.results,
          resultsType: typeof payload.results,
          resultsIsArray: Array.isArray(payload.results),
          resultsKeys: payload.results ? Object.keys(payload.results) : [],
          nestedResults: payload.results?.results ? (Array.isArray(payload.results.results) ? `array[${payload.results.results.length}]` : typeof payload.results.results) : 'none',
          metadata: payload.results?.metadata ? {
            total_votes: payload.results.metadata.total_votes,
            hasTimestamps: !!payload.results.metadata.vote_timestamps
          } : 'none'
        });
        
        // Update results when server broadcasts new results
        // Backend broadcasts: {:results_updated, election_id, results}
        // Channel pushes: %{election_id: "...", results: {results: [...], metadata: {...}}}
        if (payload.results) {
          // WebSocket payload structure: {election_id: "...", results: {results: [...], metadata: {...}}, buildInfo: {...}}
          // processResults expects: {results: {results: [...], metadata: {...}}}
          const currentTotal = results?.metadata?.total_votes;
          const newTotal = payload.results?.metadata?.total_votes;
          debugLog('[WebSocket] Vote count change:', currentTotal, '→', newTotal);
          
          // Extract server build info if present in WebSocket payload
          if (payload.buildInfo?.commitHash) {
            setServerCommitHash?.(payload.buildInfo.commitHash);
          }
          
          // Verify payload structure before processing
          if (!payload.results || typeof payload.results !== 'object') {
            debugWarn('[WebSocket] Invalid payload.results:', payload.results);
            debugWarn('[WebSocket] Skipping update - keeping existing results');
            return;
          }
          
          // Check if metadata exists and has valid total_votes
          const newTotalVotes = payload.results.metadata?.total_votes;
          const currentTotalVotes = results?.metadata?.total_votes;
          
          // Reject zero vote updates if:
          // 1. We already have results with votes > 0, OR
          // 2. We have any results loaded (even if metadata is null, ballots exist means we had data)
          if (newTotalVotes === 0 && (currentTotalVotes > 0 || (results && (results.ballots?.length > 0 || Array.isArray(results) && results.length > 0)))) {
            debugWarn('[WebSocket] Received zero votes but current state has data');
            debugWarn('[WebSocket] Current vote count:', currentTotalVotes, 'Current ballots:', results?.ballots?.length || (Array.isArray(results) ? results.length : 0));
            debugWarn('[WebSocket] This might be a calculation error - skipping update');
            return;
          }
          
          if (!Array.isArray(payload.results.results)) {
            debugWarn('[WebSocket] payload.results.results is not an array:', payload.results.results);
            debugWarn('[WebSocket] Skipping update - keeping existing results');
            return;
          }
          
          if (!payload.results.metadata || typeof payload.results.metadata !== 'object') {
            debugWarn('[WebSocket] Invalid payload.results.metadata:', payload.results.metadata);
            debugWarn('[WebSocket] Skipping update - keeping existing results');
            return;
          }
          
          // WebSocket sends: {election_id: "...", results: {results: [...], metadata: {...}}}
          // processResults expects: {results: {results: [...], metadata: {...}}}
          debugLog('[WebSocket] Processing update - vote count:', currentTotalVotes, '→', newTotalVotes);
          processResults({results: payload.results});
        } else {
          debugWarn('[WebSocket] Payload missing results:', payload);
        }
      });
      
      channel.on('vote_submitted', (payload: any) => {
        debugLog('[WebSocket] Vote submitted:', payload);
        
        // Update vote count immediately without waiting for full results calculation
        if (payload.vote_count !== undefined && payload.vote_count !== null) {
          const currentTotal = results?.metadata?.total_votes || 0;
          const newTotal = payload.vote_count;
          
          if (newTotal > currentTotal) {
            debugLog('[WebSocket] Updating vote count:', currentTotal, '→', newTotal);
            
            // Update metadata vote count immediately for responsive UI
            if (results && results.metadata) {
              setResults({
                ...results,
                metadata: {
                  ...results.metadata,
                  total_votes: newTotal
                }
              });
              setLastUpdateTime(new Date());
            } else if (results) {
              // If we have results but no metadata, add it
              setResults({
                ...results,
                metadata: {
                  total_votes: newTotal,
                  vote_timestamps: [],
                  voting_start: currentElection.voting_start,
                  voting_end: currentElection.voting_end,
                  election_identifier: currentElection.identifier
                }
              });
              setLastUpdateTime(new Date());
            } else {
              // No results yet - still update the timestamp to show activity
              setLastUpdateTime(new Date());
            }
          }
        }
      });
      
      channel.join()
        .receive('ok', () => {
          debugLog('[WebSocket] ✅ Joined dashboard channel for', currentElection.identifier);
        })
        .receive('error', (resp: any) => {
          // Always log errors, even if debug is off
          console.error('[WebSocket] ❌ Unable to join dashboard channel:', resp);
        })
        .receive('timeout', () => {
          // Always log errors, even if debug is off
          console.error('[WebSocket] ❌ Timeout joining dashboard channel');
        });
    }).catch((err) => {
      // Always log errors, even if debug is off
      console.warn('Phoenix Socket not available, using REST API only:', err);
    });
    
    // Cleanup: leave channel, disconnect socket, and clear polling
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (channel) {
        channel.leave();
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentElection]); // Only re-run when election changes, not when results/loading change

  if (!currentElection) {
    return <div style={{padding: '2rem'}}>No election selected</div>;
  }

  // Determine election status early to check if upcoming
  const now = new Date();
  const votingStart = currentElection.voting_start ? new Date(currentElection.voting_start) : null;
  const votingEnd = currentElection.voting_end ? new Date(currentElection.voting_end) : null;
  const isUpcoming = votingStart && now < votingStart;

  // For upcoming elections, show preview page instead of results
  if (isUpcoming) {
    return (
      <div style={{padding: '2rem'}}>
        <h1 style={{marginBottom: '1.3125rem'}}>Election Preview: {currentElection.title}</h1>
        {currentElection.description && (
          <p style={{marginBottom: '1rem', color: '#666'}}>{currentElection.description}</p>
        )}
        {votingStart && (
          <div style={{marginBottom: '1rem', padding: '1rem', background: '#e8f4f8', borderRadius: '8px', border: '1px solid #ccc'}}>
            <p style={{display: 'flex', margin: '0.5rem 0'}}>
              <strong style={{minWidth: '140px', textAlign: 'right', marginRight: '1rem'}}>Voting Starts:</strong>
              <span>{votingStart.toLocaleString()}</span>
            </p>
            {votingEnd && (
              <p style={{display: 'flex', margin: '0.5rem 0'}}>
                <strong style={{minWidth: '140px', textAlign: 'right', marginRight: '1rem'}}>Voting Ends:</strong>
                <span>{votingEnd.toLocaleString()}</span>
              </p>
            )}
            <p style={{display: 'flex', margin: '0.5rem 0'}}>
              <strong style={{minWidth: '140px', textAlign: 'right', marginRight: '1rem'}}>Status:</strong>
              <span style={{fontWeight: 'bold', color: '#ff9800'}}>Upcoming</span>
            </p>
          </div>
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
            {currentElection.ballots?.map((ballot, idx) => (
              <MuuriItem key={idx}>
                <div style={{border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', width: 'max-content', minWidth: '300px'}}>
                  <h2>{ballot.title}</h2>
                  {ballot.description && (
                    <p style={{fontStyle: 'italic', color: '#666', marginBottom: '0.5rem'}}>{ballot.description}</p>
                  )}
                  {ballot.number_of_winners !== undefined && ballot.candidates && (
                    <p style={{marginBottom: '1rem'}}>
                      <strong>Elect:</strong> {ballot.number_of_winners} out of {ballot.candidates.length} candidates
                    </p>
                  )}
                  {ballot.candidates && ballot.candidates.length > 0 && (
                    <div style={{marginTop: '1rem'}}>
                      <h3 style={{fontSize: '1rem', marginBottom: '0.5rem'}}>Candidates:</h3>
                      <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                        {ballot.candidates.map((candidate, cIdx) => (
                          <li key={cIdx} style={{
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            background: '#f5f5f5',
                            borderRadius: '4px'
                          }}>
                            <strong>{candidate.name}</strong>
                            {candidate.affiliation && (
                              <span style={{marginLeft: '0.5rem', color: '#666', fontSize: '0.9rem'}}>
                                ({candidate.affiliation})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </MuuriItem>
            ))}
          </MuuriComponent>
        </div>
      </div>
    );
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

  // Don't show "No votes" message if we're still loading or if metadata shows votes exist
  const ballots = results?.ballots || (Array.isArray(results) ? results : []);
  const metadata = results?.metadata || null;
  const hasVotes = metadata && metadata.total_votes && metadata.total_votes > 0;

  // Only show "No votes" if we have loaded data and confirmed there are no votes
  if ((!ballots || ballots.length === 0) && !loading && results !== null && !hasVotes) {
    return (
      <div style={{padding: '2rem'}}>
        <h1>Election Results: {currentElection.title}</h1>
        <p style={{color: '#666'}}>No votes have been submitted yet.</p>
        {metadata && (
          <>
            <div style={{marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px'}}>
              <p><strong>Total Ballots Cast:</strong> {formatVoteCount(metadata.total_votes)}</p>
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

  // Determine election status (for open/closed elections)
  // Use metadata dates if available, otherwise fall back to election dates
  const metadataVotingEnd = metadata?.voting_end ? new Date(metadata.voting_end) : null;
  const metadataVotingStart = metadata?.voting_start ? new Date(metadata.voting_start) : null;
  const votingEndForStatus = metadataVotingEnd || votingEnd;
  const votingStartForStatus = metadataVotingStart || votingStart;
  const isClosed = votingEndForStatus && now > votingEndForStatus;
  const isOpen = votingStartForStatus && votingEndForStatus && now >= votingStartForStatus && now <= votingEndForStatus;
  
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
              <span>{metadata.total_votes != null ? formatVoteCount(metadata.total_votes) : '—'}</span>
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
          {/* Only show timeline for open/closed elections, not upcoming */}
          {!isUpcoming && metadataVotingStart && metadataVotingEnd && (
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
                <strong>Quorum:</strong> {formatVoteCount(ballotResult.quorum)} votes required
                {ballotResult.quorum_status === 'met' ? (
                  <span style={{marginLeft: '0.5rem', color: '#2e7d32', fontWeight: 'bold'}}>✓ Met</span>
                ) : (
                  <span style={{marginLeft: '0.5rem', color: '#d32f2f', fontWeight: 'bold'}}>✗ Not Met ({formatVoteCount(voteCount)}/{formatVoteCount(ballotResult.quorum)})</span>
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
                {metadata && metadata.total_votes !== undefined && results && (() => {
                  // Calculate total votes processed across all ballots
                  const processedVotes = ballots.reduce((sum: number, ballot: any) => {
                    return sum + (ballot.vote_count || 0);
                  }, 0);
                  const totalVotes = metadata.total_votes || 0;
                  const pendingVotes = totalVotes - processedVotes;
                  
                  // Format last update timestamp with relative time
                  // Use currentTime state so it updates every second
                  const formatTimestamp = (date: Date | null) => {
                    if (!date) return '';
                    const now = currentTime; // Use state instead of new Date() for periodic updates
                    const diffMs = now.getTime() - date.getTime();
                    const diffSeconds = Math.floor(diffMs / 1000);
                    const diffMinutes = Math.floor(diffSeconds / 60);
                    const diffHours = Math.floor(diffMinutes / 60);
                    const diffDays = Math.floor(diffHours / 24);
                    
                    let relativeTime = '';
                    if (diffSeconds < 10) {
                      relativeTime = 'just now';
                    } else if (diffSeconds < 60) {
                      relativeTime = `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
                    } else if (diffMinutes < 60) {
                      relativeTime = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
                    } else if (diffHours < 24) {
                      relativeTime = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                    } else {
                      relativeTime = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                    }
                    
                    const timeString = date.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    });
                    
                    return `${timeString} (${relativeTime})`;
                  };
                  
                  return (
                    <div style={{marginBottom: '0.5rem', fontSize: '0.85rem', color: '#666'}}>
                      {lastUpdateTime && (
                        <div style={{fontStyle: 'italic', marginBottom: '0.25rem'}}>
                          Last updated: {formatTimestamp(lastUpdateTime)}
                        </div>
                      )}
                      <div style={{fontStyle: 'italic'}}>
                        {pendingVotes > 0
                          ? `${formatVoteCount(processedVotes)}/${formatVoteCount(totalVotes)} votes processed`
                          : `${formatVoteCount(totalVotes)} votes processed`}
                      </div>
                    </div>
                  );
                })()}
                <div style={{marginBottom: '0.5rem'}}>
                  <h3 style={{margin: 0}}>Tally Summary:</h3>
                </div>
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
                {METHOD_FAMILIES.map((family, familyIdx) => {
                  const familyMethods: Array<[string, any]> = family.methods
                    .map(method => [method, ballotResult.results?.[method]] as [string, any])
                    .filter(([_, result]) => result !== undefined) as Array<[string, any]>;

                  if (familyMethods.length === 0) return null;

                  return (
                    <div key={family.name} style={{marginTop: familyIdx > 0 ? '1rem' : '0', marginBottom: '0.5rem'}}>
                      <h4 style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase'}}>{family.name} Methods</h4>
                      {familyMethods.map(([method, methodResult]: [string, any]) => {
                        const status = methodResult.status || 'unknown';
                        const {color: statusColor, label: statusLabel} = getStatusColorAndLabel(status, !!isClosed);
                        
                        return (
                          <div key={method} style={{marginTop: '0.5rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px', borderLeft: `3px solid ${statusColor}`}}>
                            <strong>{formatMethodName(method)}:</strong>
                            {methodResult.winners && methodResult.winners.length > 0 ? (
                              <span style={{marginLeft: '0.5rem'}}>
                                {formatWinnersWithOrdering(methodResult.winners, methodResult.winner_order)}
                              </span>
                            ) : (
                              <span style={{marginLeft: '0.5rem', color: '#666', fontStyle: 'italic'}}>
                                {status === 'no_votes' ? 'No votes yet' : status === 'error' || methodResult.error ? 'Calculation failed' : 'No winners determined'}
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
                })}
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

