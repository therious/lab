import React,  {useCallback} from 'react';
import './App.css';

import {game} from './ticket/Game';
import {MapView} from './MapView';
import {actions, useSelector} from './actions-integration';
import {TicketState} from './actions/ticket-slice';
import {PlayerView} from './PlayerView';

const ta = actions.ticket;

const dealSound = new Audio('sounds/571577__el_boss__playing-card-deal-variation-1.wav')
dealSound.playbackRate = 2.5;
const playerColors = ['red', 'blue', 'green', 'orange'];
const playerOrdinals = ['first', 'second', 'third', 'fourth'];

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

  const addPlayer = useCallback(() =>{
    const name = prompt(`What is player ${playerOrdinals[players.length]} name?`);
    ta.addPlayer({name: name, color: playerColors[players.length]});
  }, [players]);

  return (
    <div className="App">
      <button onClick={() => {
        const sound = new Audio('/sounds/96130__bmaczero__shuffle.wav');
        sound.play();
        ta.resetGame()
      }}>Reset Game
      </button>
      <button disabled={turn > 1 || players.length >= playerColors.length}
              onClick={addPlayer}>Add {playerOrdinals[players.length]} player
      </button>
      <button disabled={turn >= players.length} onClick={getFive}>Get initial color cards</button>
      <button onClick={getTwo}>Get two color cards</button>
      <button disabled={players[whoPlaysNow]?.ticketsInHand.length >= 2} onClick={getTicket}>Get a ticket</button>
      <div>
        {players.map(((player,index) => <PlayerView key={index} player={player}/>))}
      </div>
      <hr/>
      <MapView/>
    </div>
  );
}

export default App;
