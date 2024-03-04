import {Ticket} from './ticket/Ticket';

type TicketCardProps = {ticket:Ticket}

const cardstyle = {
  display: 'inline-block', minHeight:'40px', minWidth:'100px',
  margin:'5px', border: "1px solid black",  padding:'5px'
};

export function TicketCard({ticket}:TicketCardProps)
{
  return <div style={{...cardstyle}}>
    <span>{ticket[0]} to {ticket[1]}</span>
    </div>
}
