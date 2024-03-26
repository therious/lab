import {Ticket} from './ticket/Ticket';

type TicketCardProps = {ticket:Ticket, completed:boolean }

// ticket svgs from https://www.svgrepo.com/vectors/ticket/3
const cardstyle = {
  display: 'inline-block', minHeight:'80px', minWidth:'140px',
  margin:'5px',
};

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


const map:Map<Ticket,string> = new Map();
export function TicketCard({ticket, completed}:TicketCardProps)
{

  if(!map.has(ticket))  map.set(ticket,randomValue(ticketSvgs) );
  const url = map.get(ticket);

  return <div style={{...cardstyle,
    textShadow: 'white 1px 1px 0',
    backgroundImage: `url('${url}')`,
    backgroundRepeat: 'no-repeat',
    backgroundSize:'cover',
    backgroundOrigin:'border-box',
    backgroundPosition:'center',
    position: 'relative'}}>
    <div style={{position:'absolute', top:5, left:12}}>{ticket[0]}</div>
    {completed? <div style={{fontSize:'46px', color:'limegreen', fontStyle:'bold', position:'absolute', top:10, right: 30}}>&#x2713;</div>:null}
    <div style={{position:'absolute', bottom:5, right:12}}>{ticket[1]}</div>
    </div>
}
