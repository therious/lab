
import {Color} from './Color';
import {Ticket } from './Ticket';
import {Route} from './Route';

export type CardsInHand =
  {
    [Color.Black]:  number;
    [Color.Red]:    number;
    [Color.Yellow]: number;
    [Color.Green]:  number;
    [Color.Blue]:   number;
    [Color.White]:  number;
    [Color.Wild]:   number;
  };


export type Player = {
  name:             string;
  color:            string;
  colorCardsInHand: CardsInHand;
  colorCardsCount: number;
  ticketsInHand:    Ticket[];
  ticketsCompleted: Ticket[];
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
  colorCardsCount: 0,
  ticketsInHand:[],
  ticketsCompleted:[],
  routesOwned:[],
} ;

