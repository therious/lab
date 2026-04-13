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

// -- users library slices --
import { chatSlice, usersSlice } from '@therious/users';
import type { ChatState, UsersState } from '@therious/users';

//-- middlewares
import { chatMiddleware } from '@therious/users';

export const allSlices = [requestSlice, notifySlice, coverageSlice, localSlice, ticketSlice, chatSlice, usersSlice];
export const allMiddlewares = [ fatalMiddleware, coverageMiddleware, chatMiddleware, loggingMiddleware];
export const middlewareInits = [  coverageMiddlewareInit];

export type TotalState = {
   request: RequestState;
    notify: NotifyState;
  coverage: CoverageState;
     local: LocalState;
    ticket: TicketState;
      chat: ChatState;
     users: UsersState;
}
