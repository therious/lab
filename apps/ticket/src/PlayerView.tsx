import React,  {useState, useEffect} from 'react';
import {CardHand} from './ColorCard';
import {TicketCard} from './TicketCard';

import {Player} from './ticket/Player';
import {useSelector} from './actions-integration';
import {TicketState} from './actions/ticket-slice';
import {playFanfare, playSoundCompleteTicket} from './effects/sounds';
import styled from 'styled-components';

const PlayerDiv = styled.div<{$players:unknown[], $myTurn:boolean}>`
  flex: 1;
  margin: 5px;
  padding-top: 10px;
  width: ${p=>(100 / p.$players.length) - 5}%;
  border: 1px solid black;
  background-color: ${p=>p.$myTurn ? '#cff': '#ccc'};
`;

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

  return <PlayerDiv
  $players={players} $myTurn={players[whoPlaysNow] === player}>
    {player.name} <img alt={`${player.color} train`} width={'50px'} src={`./icons/car-${player.color}.png`}/>
    <hr/>
    <CardHand player={player}/>
    <hr/>
    {player.ticketsCompleted.map((ticket,i)=> <TicketCard key={`c-${i}`} player={player} completed={true} ticket={ticket}/>)}
    {player.ticketsInHand.map((ticket,i)=> <TicketCard key={i} player={player} completed={false} ticket={ticket}/>)}
  </PlayerDiv>
}
