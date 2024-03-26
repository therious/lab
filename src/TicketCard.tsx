import {Ticket} from './ticket/Ticket';

type TicketCardProps = {ticket:Ticket, completed:boolean }

import styled from 'styled-components';

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

  &:hover {
    /* Start the shake animation and make the animation last for 0.5 seconds */
    animation: shake 0.5s;
   
    /* When the animation is finished, start again */
    animation-iteration-count: infinite;
  }

  &.completed {
    animation: shake 0.5s;
    animation-iteration-count: 6;
  }

  @keyframes shake {
    0%   { transform: scale(125%) translate( 1px,  1px) rotate( 0deg); z-index: 1000}
    10%  { transform: scale(150%) translate(-1px, -2px) rotate(-2deg); z-index: 1000}
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
const ticketSvgs = [
  // '/tickets/black.svg',
  '/tickets/blue.svg',
  '/tickets/orange.svg',
  '/tickets/otheryellow.svg',
  '/tickets/pink.svg',
  '/tickets/yellow.svg'
];

function randomRange(min:number, max:number):number { return Math.floor(Math.random() * (max - min + 1) + min); }
function randomValue<T>(arr:T[]):T                  { return arr[randomRange(0, arr.length-1)] }


const map:Map<Ticket, string> = new Map();
export function TicketCard({ticket, completed}:TicketCardProps)
{

  if(!map.has(ticket))  map.set(ticket,randomValue(ticketSvgs) );
  const url = map.get(ticket);

  return <TicketDiv $url={url!} className={completed? 'completed':''}>
    <div style={{position:'absolute', top:5, left:12}}>{ticket[0]}</div>
    {completed? <div style={{fontSize:'46px', color:'limegreen', fontStyle:'bold', position:'absolute', top:10, right: 30}}>&#x2713;</div>:null}
    <div style={{position:'absolute', bottom:5, right:12}}>{ticket[1]}</div>
  </TicketDiv>
}
