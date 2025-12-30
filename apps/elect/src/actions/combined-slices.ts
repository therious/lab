import {
  requestSlice,
  RequestState,
  notifySlice,
  NotifyState,
  coverageSlice,
  CoverageState,
  loggingMiddleware,
  fatalMiddleware,
  coverageMiddleware,
  coverageMiddlewareInit,
} from '@therious/actions';

import {sliceConfig as electionSlice, ElectionState} from './election-slice';

export const allSlices = [requestSlice, notifySlice, coverageSlice, electionSlice];
export const allMiddlewares = [fatalMiddleware, coverageMiddleware, loggingMiddleware];
export const middlewareInits = [coverageMiddlewareInit];

export type TotalState = {
  request: RequestState;
  notify: NotifyState;
  coverage: CoverageState;
  election: ElectionState;
};

