import {Player} from '../ticket/Player';

export interface TicketState {
  players:Player[];
  whoPlaysNow: number; // index of player to play next
  turn:number;         // absolute count of turns
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
/*
 */



// type value will be added automatically to creators to match the key, or better yet to match the slice/key
const creators:TicketCreators = {
  resetGame: ()=>({}),
  addPlayer: (player)=>({player})
};

const reducers:TicketReducers = {
  resetGame: (s)=>({...initialState}),
  addPlayer:(s, {player})=>({...s, players: [...s.players, player]})

};

export const sliceConfig:SliceConfig = {name: 'ticket', creators, initialState, reducers};

