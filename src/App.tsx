import React,  {useCallback, useState} from 'react';
import './App.css';

import {Color} from './ticket/Color';
import {Game} from './ticket/Game';
import {Ticket} from './ticket/Ticket';
import {ColorCard} from './ColorCard';
import {TicketCard} from './TicketCard';

const game = new Game();

function App() {
  const [ccards, setCcards] = useState<Color[]>([]);
  const [tcards, setTcards] = useState<Ticket[]>([]);
  const getFive = useCallback(()=>{
    setCcards([...ccards, ...game.colorDeck.deal(5)]);
  },[ccards]);

  const getTwo = useCallback(()=>{
    setCcards([...ccards, ...game.colorDeck.deal(2)]);
  },[ccards]);

  const getTicket = useCallback(()=>{
    setTcards([...tcards, ...game.ticketDeck.deal(1)]);
  },[tcards]);



  return (
    <div className="App">
      <button onClick={getFive}>Deal colors</button>
      <button onClick={getTwo}>Get Two more</button>
      <button onClick={getTicket}>Get a ticket</button>

      <div>
        <p>Number of cards: {ccards.length}</p>

        {ccards.map(col => <ColorCard color={col}/>)}
        <hr/>
        <p>Remaining cards: {game.colorDeck.remaining().length}</p>

        {game.colorDeck.remaining().map(col => <ColorCard color={col}/>)}
      </div>
      <div>
        <p>Number of cards: {tcards.length}</p>
        {tcards.map(ticket => <TicketCard ticket={ticket}/>)}
        <hr/>
        <p>Remaining cards: {game.ticketDeck.remaining().length}</p>
        {game.ticketDeck.remaining().map(ticket => <TicketCard ticket={ticket}/>)}
      </div>
    </div>
  );
}

export default App;
