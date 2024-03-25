import React,  {useCallback, useState, useEffect} from 'react';
import './App.css';

import {game} from './ticket/Game';
import {MapView} from './MapView';
import {actions, useSelector} from './actions-integration';
import {TicketState} from './actions/ticket-slice';
import {PlayerView} from './PlayerView';

const ta = actions.ticket;

const dealSound = new Audio('sounds/571577__el_boss__playing-card-deal-variation-1.wav')

function App() {
  const {players, turn, whoPlaysNow} = useSelector<TicketState>(s => s.ticket);
  const dealColorCards = useCallback((count:number)=>{
    let clippedCount = Math.min(game.colorDeck.remaining().length, count);

      const dealOne = () =>{

        if(clippedCount) {
          --clippedCount;
          ta.drawColors(game.colorDeck.deal(1));
          dealSound.play();
          if(!clippedCount)
            ta.nextPlayer();
        }


      };
      dealOne();
      dealSound.addEventListener('ended', dealOne);

  },[])

  const getFive   = useCallback(()=>dealColorCards(5),[]);
  const getTwo    = useCallback(()=>dealColorCards(2),[]);
  const getTicket = useCallback(()=>ta.drawTicket(game.ticketDeck.deal(1)[0]),[]);

  return (
    <div className="App">
      <button onClick={()=>{
      const sound = new Audio('/sounds/96130__bmaczero__shuffle.wav');
      sound.play();
      ta.resetGame()}}>Reset Game</button>
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
