import React,  {useCallback, useState, useEffect} from 'react';

import {Color} from './ticket/Color';
import {Player} from './ticket/Player';
import {TicketCard} from './TicketCard';
import {actions, useSelector} from './actions-integration';
import {TicketState} from './actions/ticket-slice';
import {ColorCard} from './ColorCard';


type PlayerViewProps = { player:Player }
export function PlayerView({player}:PlayerViewProps) {
  const {players, turn, whoPlaysNow} = useSelector<TicketState>(s=>s.ticket);
  const [prevCompleted, setPrevCompleted] = useState<number>(player.ticketsCompleted.length);
  useEffect(()=>{
    const completed = player.ticketsCompleted.length;
    if(prevCompleted < completed)
    {
      const sounds = [
        '/sounds/89590__cgeffex__human_human-train-whistle-vers1.mp3',
        '/sounds/94216__benboncan__steam-train-1.wav',
        '/sounds/170848__eliasheuninck__steam-train-horn-02.wav',
        '/sounds/224002__secretmojo__blues-harmonica-train-whistles.flac',
        '/sounds/170848__eliasheuninck__steam-train-horn-02.wav',
        '/sounds/345905__basoap__train-whistle.wav'
      ];
      const audio = new Audio(sounds[turn % sounds.length])
      audio.play();
    }
    setPrevCompleted(completed);
  }, [prevCompleted, turn])
  const itsMyTurn = players[whoPlaysNow] === player;

  return <div style={{display:'inline-block', paddingTop:'10px', width:'40%', border: '1px solid black', backgroundColor: itsMyTurn? 'cornsilk':'white'}}>
    Player: {player.name} <img width={'50px'} src={`./icons/car-${player.color}.png`}/>
    <div>
      Colors in Hand:
      {Object.entries(player.colorCardsInHand).filter(([k,v])=>v).map(([k,v])=>{
        return <ColorCard color={k as Color} count={v}/>
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
