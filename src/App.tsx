import React,  {useCallback, useState} from 'react';
import './App.css';

import {Game} from './ticket/Game';
import {Player} from './ticket/Player';
import {TicketCard} from './TicketCard';
import {MapView} from './MapView';
import {actions, useSelector} from './actions-integration';
import {TicketState} from './actions/ticket-slice';
import {ColorCard} from './ColorCard';
import {Color} from './ticket/Color';

const game = new Game();

type PlayerViewProps = { player:Player }
function PlayerView({player}:PlayerViewProps) {
  const {players, turn, whoPlaysNow} = useSelector<TicketState>(s=>s.ticket);


// ... check if its this players turn
  return <div style={{border: '1px solid black'}}>
    Player: {player.name}
    <div>
      Colors in Hand:
      {Object.entries(player.colorCardsInHand).filter(([k,v])=>v).map(([k,v])=>{
        return <ColorCard color={Number(k)} count={v}/>
      })}

    </div>
    <div>
      Tickets in Hand:
      {player.ticketsInHand.map(ticket => <TicketCard ticket={ticket}/>)}
    </div>
    <div>
      Tickets completed:
      {player.ticketsCompleted.map(ticket => <TicketCard ticket={ticket}/>)}
    </div>
  </div>
}

const ta = actions.ticket;

function App() {
  const {players, turn, whoPlaysNow} = useSelector<TicketState>(s => s.ticket);
  const getFive   = useCallback(()=>ta.drawColors(game.colorDeck.deal(5)),[]);
  const getTwo    = useCallback(()=>ta.drawColors(game.colorDeck.deal(2)),[]);
  const getTicket = useCallback(()=>ta.drawTicket(game.ticketDeck.deal(1)[0]),[]);

  return (
    <div className="App">
      <button onClick={ta.resetGame}>Reset Game</button>
      <button onClick={() => ta.addPlayer({name: 'Zaidy', color: 'red'})}>Add first player</button>
      <button onClick={() => ta.addPlayer({name: 'Rivka', color: 'blue'})}>Add second player</button>
      <hr/>
      <button onClick={getFive}>Deal colors</button>
      <button onClick={getTwo}>Get Two more</button>
      <button onClick={getTicket}>Get a ticket</button>
      <hr/>
      <p>Players {players.length} Turn: {turn}, Whose
        turn: {players.length ? players[whoPlaysNow]?.name : 'no players yet'}</p>

      <div>{players.map(player => <PlayerView player={player}/>)}</div>
      <div>
        <p>Number of remaining color cards: {game.colorDeck.remaining().length}</p>
        <p>Number of remaing tickets: {game.ticketDeck.remaining().length}</p>
      </div>
      <MapView/>
    </div>
  );
}

export default App;
