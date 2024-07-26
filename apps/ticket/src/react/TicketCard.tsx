import {useState, useEffect, useCallback} from 'react';
import styled from 'styled-components';
import {Random} from '@therious/random';
import {Ticket} from '../ticket/Ticket';
import {Player} from '../ticket/Player';

type TicketCardProps = {ticket:Ticket, player:Player, completed:boolean }

const TicketDiv = styled.div<{$url:string}>`
  display: inline-block;
  min-height: 80px; min-width: 140px;
  margin: 5px;
  text-shadow: white 1px 1px 0;
  background-image: url('${p=>p.$url}');
  background-repeat: no-repeat;
  background-size: cover;
  background-origin: border-box;
  background-position: center;
  position: relative;
  transform-style: preserve-3d;
  animation: intro 2s;
  animation-iteration-count: 1;
  perspective: 10px;
  //transition: 2s all;

  &:hover {
    animation: shake 0.5s;
    animation-iteration-count: 2.5;
    transform: scale(250%) rotate(0deg); z-index: 1000;
    filter: drop-shadow(12px 12px 22px rgba(0, 0, 0, 0.32));
  } 
  
  &.postIntro:not(:hover)
  {
    animation-iteration-count:0;
    transition: none !important;
  }
  &.completed:not(:hover) {
    animation: shake 0.5s;
    animation-iteration-count: 6;
  }
  
  @keyframes intro {
    0%   { transform:  scale(10) translate3d(1000px, 1000px, 1000px) rotateX(3600deg)  rotateY(360deg)  rotateZ(90deg); z-index: 1000;}
    100% { transform:  scale(1) translate3d(0px, 0px, 0px) rotateX(0deg);  rotateY(0deg)  rotateZ(0deg);  z-index: 1000;}
  }
 
  @keyframes shake {
    0%   { transform: scale(125%) translate( 1px,  1px) rotate( 0deg); z-index: 1000}
    10%  { transform: scale(150%) translate(-1px, -2px) rotate(-2deg);  z-index: 1000}
    20%  { transform: scale(175%) translate(-3px,  0px) rotate(-4deg); z-index: 1000}
    30%  { transform: scale(200%) translate( 3px,  2px) rotate(-6deg); z-index: 1000}
    40%  { transform: scale(225%) translate( 1px, -1px) rotate(-4deg); z-index: 1000}
    50%  { transform: scale(250%) translate(-1px,  2px) rotate(-2deg); z-index: 1000}
    60%  { transform: scale(225%) translate(-3px,  1px) rotate( 0deg); z-index: 1000}
    70%  { transform: scale(200%) translate( 3px,  1px) rotate( 2deg); z-index: 1000}
    80%  { transform: scale(175%) translate(-1px, -1px) rotate( 4deg); z-index: 1000}
    90%  { transform: scale(150%) translate( 1px,  2px) rotate( 6deg); z-index: 1000}
    100% { transform: scale(125%) translate( 1px, -2px) rotate( 4deg); z-index: 1000}
  }
  
`;

// ticket svgs from https://www.svgrepo.com/vectors/ticket/3
const ticketSvgs:string[]   = Object.values(import.meta.glob('../assets/tickets/*',  {query: '?url', import: 'default', eager: true}));





const map:Map<Ticket, string> = new Map();
const rc:Random<string> = new Random(5,5);

export function TicketCard({ticket, player, completed}:TicketCardProps)
{
  const [completedNum, setCompletedNum] = useState<number>(0);
  const [hoveredAtLeastOnce, setHoveredAtLeastOnce] = useState<boolean>(false);

  useEffect(()=>{
    const index = player.ticketsCompleted.indexOf(ticket);
    if(index >= 0) setCompletedNum(index+1);
  }, [completed]);
  const cancelIntro = useCallback(()=>setHoveredAtLeastOnce(true),[]);

  if(!map.has(ticket))  map.set(ticket, rc.random(ticketSvgs) );
  const url = map.get(ticket);

  const classNames = `${completed? 'completed':''} ${hoveredAtLeastOnce? 'postIntro': ''}`;

  return <TicketDiv  $url={url!} className={classNames}>
    <div onMouseEnter={cancelIntro} style={{position:'absolute', top:5, left:12}}>{ticket[0]}</div>
    {completed? <div style={{fontSize:'46px', color:'limegreen', fontStyle:'bold', position:'absolute', top:10, right: 30}}>{completedNum?completedNum:''}&#x2713;</div>:null}
    <div style={{position:'absolute', bottom:5, right:12}}>{ticket[1]}</div>
  </TicketDiv>
}
