import React,  {useCallback} from 'react';
import './App.css';

import {game} from './ticket/Game';
import {MapView} from './MapView';
import {actions, useSelector} from './actions-integration';
import {TicketState} from './actions/ticket-slice';
import {PlayerView} from './PlayerView';
import {dealCardsSoundEffect, playShuffleSound, playVend} from './effects/sounds';
import styled from 'styled-components';
const ta = actions.ticket;

const playerColors = ['red', 'blue', 'green', 'orange'];
const playerOrdinals = ['first', 'second', 'third', 'fourth'];

const Button = styled.button`
  margin-left: 10px;
  margin-right: 10px;
  margin-top: 10px;
  margin-bottom: 5px;
`;

export const Game = () =>
{
  const {players, turn, whoPlaysNow} = useSelector<TicketState>(s => s.ticket);
  const dealColorCards = useCallback((count:number)=>{
    const clippedCount = Math.min(game.colorDeck.remaining().length, count);
    dealCardsSoundEffect(clippedCount, ()=>ta.drawColors(game.colorDeck.deal(1)), ta.nextPlayer);
  },[]);
  const getFive   = useCallback(()=>dealColorCards(5),[dealColorCards]);
  const getTwo    = useCallback(()=>dealColorCards(2),[dealColorCards]);
  const getTicket = useCallback(()=>{playVend(); ta.drawTicket(game.ticketDeck.deal(1)[0])},[]);
  const addPlayer = useCallback(() =>{
    const name = prompt(`What is player ${playerOrdinals[players.length]} name?`);
    ta.addPlayer({name: name, color: playerColors[players.length]});
  }, [players]);

  return (
    <div className="App">
      <Button onClick={() => {
      playShuffleSound();
        ta.resetGame()
      }}>Reset Game
      </Button>
      <Button disabled={turn > 1 || players.length >= playerColors.length}
              onClick={addPlayer}>Add {playerOrdinals[players.length]} player
      </Button>
      <Button disabled={turn >= players.length} onClick={getFive}>Get initial color cards</Button>
      <Button onClick={getTwo}>Get two color cards</Button>
      <Button disabled={players[whoPlaysNow]?.ticketsInHand.length >= 2} onClick={getTicket}>Get a ticket</Button>
      <div style={{display:'flex'}}>
        {players.map(((player,index) => <PlayerView key={index} player={player}/>))}
      </div>
      <hr/>
      <MapView/>
    </div>
  );
};
