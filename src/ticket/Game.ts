import {Routes, Route} from './Route';
import {ColorDeck} from './ColorDeck';
import {TicketDeck} from './Ticket';

export class Game {
  readonly players: string[];
  readonly colorDeck: ColorDeck;
  readonly ticketDeck:TicketDeck;
  readonly routes:Route[] = Routes;

  constructor() {
    this.players = ["Rivka", "Zaidy"]; // hard coded for now
    this.colorDeck = new ColorDeck();
    this.ticketDeck = new TicketDeck();

    this.ticketDeck.shuffle();
    this.colorDeck.shuffle();
    this.routes = Routes;  // routes must be fried or occupied
  }

}
