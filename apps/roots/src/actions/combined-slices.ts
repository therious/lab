// -- standard slices --
import {requestSlice,RequestState, notifySlice,NotifyState, loggingMiddleware, fatalMiddleware} from "@therious/actions";
import {sliceConfig as optionsSlice,OptionsState} from "./options-slice";

// -- app specific slices --
import {sliceConfig as localSlice, LocalState} from "./local-slice";
import {sliceConfig as gridSlice, GridState} from "./grid-slice";

// -- users library slices --
import { chatSlice, usersSlice } from '@therious/users';
import type { ChatState, UsersState } from '@therious/users';
import { chatMiddleware } from '@therious/users';

export const allSlices = [requestSlice, notifySlice, localSlice, optionsSlice, gridSlice, chatSlice, usersSlice];
export const allMiddlewares = [ fatalMiddleware, chatMiddleware, loggingMiddleware];
export const middlewareInits:any[] = [];

export type TotalState = {
   request: RequestState;
    notify: NotifyState;
     local: LocalState;
   options: OptionsState;
      grid: GridState;
      chat: ChatState;
     users: UsersState;
}

