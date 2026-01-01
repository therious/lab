import React from 'react';
import {useLocation} from 'react-router-dom';
import {useSelector} from '../actions-integration';
import {TotalState} from '../actions/combined-slices';
import {Ballot} from '../actions/election-slice';
import {VotingInterface} from './VotingInterface';

export function BallotView() {
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

