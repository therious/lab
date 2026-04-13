// -- standard slices --
import {requestSlice,   RequestState,
        notifySlice,   NotifyState,
        coverageSlice, CoverageState,
        //-- standard middlewares
        loggingMiddleware, fatalMiddleware, coverageMiddleware, coverageMiddlewareInit
        } from "@therious/actions";


// -- app specific slices --
import {sliceConfig as localSlice,  LocalState}  from "./local-slice";
import {sliceConfig as ticketSlice, TicketState} from './ticket-slice';
import {sliceConfig as chatSlice,  ChatState}  from './chat-slice';
import {sliceConfig as usersSlice, UsersState} from './users-slice';


//-- app specific middlewares
import { chatMiddleware } from './chat-middleware';

export const allSlices = [requestSlice, notifySlice, coverageSlice, localSlice, ticketSlice, chatSlice, usersSlice];
export const allMiddlewares = [ fatalMiddleware, coverageMiddleware, chatMiddleware, loggingMiddleware];
export const middlewareInits = [  coverageMiddlewareInit];

// when I get smarter about deriving types in typescript I can presumably fix this (he claims)
// but the important thing is it makes every part of state known
//There is a source of truth problem, I need to derive the keys from the slice names directly encountered issues
// with non-literals
export type TotalState = {
   request: RequestState;
    notify: NotifyState;
  coverage: CoverageState;
     local: LocalState;
    ticket: TicketState;
      chat: ChatState;
     users: UsersState;
}

