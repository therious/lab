import React, {useState} from 'react';
import {useSelector} from '../actions-integration';
import {TotalState} from '../actions/combined-slices';
import {MuuriComponent} from 'muuri-react';
import {VoteTimeline} from './VoteTimeline';
import {MuuriItem} from './Layout';
import {METHOD_FAMILIES} from './constants';
import {formatMethodName, formatWinnersWithOrdering, getStatusColorAndLabel} from './utils';

export function ResultsView() {
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

  // Determine election status (for open/closed elections)
  const votingEnd = metadata?.voting_end ? new Date(metadata.voting_end) : null;
  const votingStart = metadata?.voting_start ? new Date(metadata.voting_start) : null;
  const isClosed = votingEnd && now > votingEnd;
  const isOpen = votingStart && votingEnd && now >= votingStart && now <= votingEnd;
  
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
          {/* Only show timeline for open/closed elections, not upcoming */}
          {!isUpcoming && metadata.voting_start && metadata.voting_end && (
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

