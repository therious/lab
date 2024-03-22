
import {Color} from './Color';
import {Ticket } from './Ticket';
import {Route} from './Route';

export type CardsInHand =
  {
    [Color.Red]:    number;
    [Color.Green]:  number;
    [Color.Black]:  number;
    [Color.Blue]:   number;
    [Color.White]:  number;
    [Color.Wild]:   number;
    [Color.Yellow]: number;
  };


export type Player = {
  name:             string;
  color:            string;
  colorCardsInHand: CardsInHand;
  ticketsInHand:    Ticket[];
  completedTickets: Ticket[];
  routesOwned:      Route[];
}


export const playerTemplate:Omit<Player, 'name'|'color'>  = {
  colorCardsInHand: {
    [Color.Red]:    0,
    [Color.Green]:  0,
    [Color.Blue]:   0,
    [Color.Black]:  0,
    [Color.Yellow]: 0,
    [Color.White]:  0,
    [Color.Wild]:   0,
  },
  ticketsInHand:[],
  completedTickets:[],
  routesOwned:[],
} ;

