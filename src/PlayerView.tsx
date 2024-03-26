import React,  {useState, useEffect} from 'react';
import {CardHand} from './ColorCard';
import {TicketCard} from './TicketCard';

import {Player} from './ticket/Player';
import {useSelector} from './actions-integration';
import {TicketState} from './actions/ticket-slice';
import {playFanfare, playSoundCompleteTicket} from './effects/sounds';


type PlayerViewProps = { player:Player }
export function PlayerView({player}:PlayerViewProps) {
  const {players, turn, whoPlaysNow} = useSelector<TicketState>(s=>s.ticket);
  const [prevCompleted, setPrevCompleted] = useState<number>(player.ticketsCompleted.length);
  useEffect(()=>{
    const completed = player.ticketsCompleted.length;
    if(prevCompleted < completed)
    {
      playSoundCompleteTicket();
      if(completed === 1) playFanfare();
    }
    setPrevCompleted(completed);
  }, [prevCompleted, turn]);


  const itsMyTurn = players[whoPlaysNow] === player;

  return <div style={{flex:1, paddingTop:'10px', width:`${(100 / players.length)-5}%`, border: '1px solid black', backgroundColor: itsMyTurn? 'cornsilk':'white'}}>
    {player.name} <img alt={`${player.color} train`} width={'50px'} src={`./icons/car-${player.color}.png`}/>
    <hr/>
    <CardHand player={player}/>
    <div>
      {player.ticketsCompleted.map((ticket,i)=> <TicketCard key={`c-${i}`} completed={true} ticket={ticket}/>)}
      {player.ticketsInHand.map((ticket,i)=> <TicketCard key={i} completed={false} ticket={ticket}/>)}
    </div>
  </div>
}
