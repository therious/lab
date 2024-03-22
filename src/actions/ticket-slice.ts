import {Player, playerTemplate} from '../ticket/Player';
import {Color} from '../ticket/Color';
import {Route, Nettie} from '../ticket/Route';
import {Ticket} from '../ticket/Ticket';
import {City} from '../ticket/City';
import {produce} from 'immer';

export interface TicketState {
  players:     Player[];
  whoPlaysNow: number; // index of player to play next
  turn:        number;         // absolute count of turns
}

type TicketCreator = (s:TicketState,...rest: any)=>unknown;
type TicketCreators = Record<string, TicketCreator>;
type TicketReducer = (s:TicketState,...rest: any)=>TicketState;
type TicketReducers = Record<string, TicketReducer>;

interface SliceConfig {
  name: string;
  reducers: TicketReducers;
  creators: TicketCreators;
  initialState: TicketState;
}
const initialState:TicketState = {
  players:[],
  whoPlaysNow: 0,
  turn:0
};

// utility functions
const incrementTurn = (s:TicketState)=>({...s, turn:s.turn+1, whoPlaysNow:(s.turn+1)%s.players.length});


const routeTouchesCity = (route:Route, city:City) =>
{
  return route.cities[0] === city || route.cities[1] === city;
}
const isTicketComplete = (routes:Route[], ticket:Ticket)=>
{
  const a = ticket[0], b = ticket[1];
  const net = new Nettie(routes);
  if(!net.containsBoth(a, b))     // first check if both a and b are in the graph
    return false;
  return net.connects(a, b);
}

// type value will be added automatically to creators to match the key, or better yet to match the slice/key
const creators:TicketCreators = {
  resetGame: ()=>({}),
  addPlayer: (player)=>({player}),
  drawColors:(cards)=>({cards}),     // giving a player his initial cards is done this way too
  drawTicket:(ticket)=>({ticket}),
  claimRoute:(route)=>({route}),
};

const reducers:TicketReducers = {
  resetGame: (s)=>({...initialState}),
  addPlayer: (s, {player})=>({...s, players: [...s.players, {...playerTemplate, ...player} ]}),
  drawColors:(s:TicketState, {cards})=>produce(s, draft=>{
    const playerIndex = draft.whoPlaysNow;
    const player:Player = draft.players[playerIndex];
    cards.forEach((card:Color)=>player.colorCardsInHand[card]++);
    ++draft.turn;
    draft.whoPlaysNow = draft.turn % draft.players.length;
  }),
  drawTicket:(s:TicketState, {ticket})=>produce(s, draft=>{
    const playerIndex = draft.whoPlaysNow;
    const player:Player = draft.players[playerIndex];
    player.ticketsInHand.push(ticket);
  }),
  claimRoute:(s:TicketState, {route})=>produce(s, draft=>{
    const playerIndex = draft.whoPlaysNow;
    const player:Player = draft.players[playerIndex];
    player.routesOwned.push(route);
    // does this complete any tickets?
    [...player.ticketsInHand].forEach(ticket=>{
      if(isTicketComplete(player.routesOwned, ticket)) {
        const completed = ticket;
        player.ticketsInHand =  player.ticketsInHand.filter(t=>t!==completed);  // remove from in hand to completed
        player.ticketsCompleted.push(ticket);
      }
    });
    ++draft.turn;
    draft.whoPlaysNow = draft.turn % draft.players.length;
  }),

};

export const sliceConfig:SliceConfig = {name: 'ticket', creators, initialState, reducers};

