import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';
import {actions} from '../actions-integration';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
`;

const Title = styled.h1`
  margin: 0 0 1.5rem 0;
  color: #333;
  text-align: center;
`;

const ElectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ElectionCard = styled.button<{$selected: boolean}>`
  padding: 1rem;
  border: 2px solid ${props => props.$selected ? '#667eea' : '#ddd'};
  border-radius: 8px;
  background: ${props => props.$selected ? '#f0f4ff' : 'white'};
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    background: #f0f4ff;
  }
`;

const ElectionTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #333;
`;

const ElectionDescription = styled.p`
  margin: 0;
  color: #666;
  font-size: 0.9rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Button = styled.button<{$disabled?: boolean}>`
  padding: 0.75rem 1.5rem;
  background: ${props => props.$disabled ? '#ccc' : '#667eea'};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #5568d3;
  }
  
  &:disabled:hover {
    background: #ccc;
  }
`;

const ErrorMessage = styled.div`
  padding: 0.75rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  font-size: 0.9rem;
`;

interface BallotSummary {
  title: string;
  candidate_count: number;
}

interface Election {
  identifier: string;
  title: string;
  description?: string;
  voting_start?: string;
  voting_end?: string;
  ballot_count?: number;
  status?: 'upcoming' | 'open' | 'closed' | 'unknown';
  ballot_summary?: BallotSummary[];
}

export function LandingPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load elections on mount
  React.useEffect(() => {
    fetch('/api/elections', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(async res => {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.elections) {
          setElections(data.elections);
        } else {
          setElections([]);
        }
      })
      .catch(err => {
        console.error('Failed to load elections:', err);
        setError(`Failed to load elections: ${err.message}. Please check that the server is running.`);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedElection || !email) {
      setError('Please select an election and enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          election_identifier: selectedElection,
          email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to request token. Please try again.');
        setLoading(false);
        return;
      }

      // Store tokens in both sessionStorage and Redux
      const {token, view_token} = data;
      sessionStorage.setItem('vote_token', token);
      sessionStorage.setItem('view_token', view_token);
      sessionStorage.setItem('election_identifier', selectedElection);
      sessionStorage.setItem('user_email', email); // Store email for display

      // Load election details with ballots
      const electionResponse = await fetch(`/api/elections/${selectedElection}`);
      const electionData = await electionResponse.json();

      if (electionResponse.ok && electionData.ballots) {
        // Initialize election in Redux (this stores token in Redux state)
        actions.election.initializeElection(
          {
            identifier: electionData.identifier,
            title: electionData.title,
            description: electionData.description,
            ballots: electionData.ballots,
            voting_start: electionData.voting_start,
            voting_end: electionData.voting_end,
          },
          token,
          view_token
        );

        // Navigate to summary
        navigate('/summary');
      } else {
        setError('Failed to load election details.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error requesting token:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Title>Select an Election</Title>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ElectionList>
          {elections.map(election => {
            const isUpcoming = election.status === 'upcoming';
            const isOpen = election.status === 'open';
            const isClosed = election.status === 'closed';
            
            return (
              <ElectionCard
                key={election.identifier}
                $selected={selectedElection === election.identifier}
                onClick={() => setSelectedElection(election.identifier)}
              >
              <ElectionTitle>
                {election.title}
                {isUpcoming && (
                  <span style={{marginLeft: '0.5rem', fontSize: '0.85rem', color: '#ff9800', fontWeight: 'normal'}}>
                    (Upcoming)
                  </span>
                )}
                {isOpen && (
                  <span style={{marginLeft: '0.5rem', fontSize: '0.85rem', color: '#4caf50', fontWeight: 'normal'}}>
                    (Open)
                  </span>
                )}
                {isClosed && (
                  <span style={{marginLeft: '0.5rem', fontSize: '0.85rem', color: '#d32f2f', fontWeight: 'normal'}}>
                    (Closed)
                  </span>
                )}
              </ElectionTitle>
              {election.description && (
                <ElectionDescription>{election.description}</ElectionDescription>
              )}
              {election.ballot_summary && election.ballot_summary.length > 0 && (
                <ElectionDescription style={{fontSize: '0.85rem', marginTop: '0.25rem'}}>
                  <strong>Key ballots:</strong> {election.ballot_summary.map(b => b.title).join(', ')}
                  {election.ballot_count && election.ballot_count > election.ballot_summary.length && (
                    <span> and {election.ballot_count - election.ballot_summary.length} more</span>
                  )}
                </ElectionDescription>
              )}
              {isUpcoming && election.voting_start && (
                <ElectionDescription style={{fontStyle: 'italic', color: '#666', fontSize: '0.85rem'}}>
                  Voting opens: {new Date(election.voting_start).toLocaleString()}
                </ElectionDescription>
              )}
              </ElectionCard>
            );
          })}
        </ElectionList>

        {elections.length === 0 && !error && (
          <p style={{textAlign: 'center', color: '#666', margin: '1rem 0'}}>
            No elections are currently available.
          </p>
        )}

        <Form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Enter your email address (test: user@unregistered.com or user@voted-already.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || elections.length === 0}
          />
          <Button
            type="submit"
            $disabled={loading || !selectedElection || !email || elections.length === 0}
          >
            {loading ? 'Requesting...' : 'Request Ballot Access'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
}

