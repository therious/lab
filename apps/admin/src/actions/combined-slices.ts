import {
  requestSlice, RequestState,
  notifySlice,  NotifyState,
  loggingMiddleware, fatalMiddleware,
} from '@therious/actions';

import { chatSlice, usersSlice, chatMiddleware } from '@therious/users';
import type { ChatState, UsersState } from '@therious/users';

export const allSlices      = [requestSlice, notifySlice, chatSlice, usersSlice];
export const allMiddlewares = [fatalMiddleware, chatMiddleware, loggingMiddleware];
export const middlewareInits: any[] = [];

export type TotalState = {
  request: RequestState;
  notify:  NotifyState;
  chat:    ChatState;
  users:   UsersState;
};
