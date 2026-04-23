// ── Standard slices & middleware from @therious/actions ──────────────────────
import {
  requestSlice,  RequestState,
  notifySlice,   NotifyState,
  coverageSlice, CoverageState,
  loggingMiddleware, fatalMiddleware,
  coverageMiddleware, coverageMiddlewareInit,
} from '@therious/actions';

// ── Users / chat slices ───────────────────────────────────────────────────────
import { chatSlice, usersSlice, chatMiddleware } from '@therious/users';
import type { ChatState, UsersState }            from '@therious/users';

// ── App-specific slices ───────────────────────────────────────────────────────
import { sliceConfig as localSlice,   LocalState   } from './local-slice';
import { sliceConfig as controlSlice, ControlState } from './control-slice';
import { sliceConfig as linnSlice,    LinnState    } from './linn-slice';
import { sliceConfig as midiSlice,    MidiState    } from './midi-slice';
import { sliceConfig as patchSlice,   PatchState   } from './patch-slice';

export const allSlices      = [requestSlice, notifySlice, coverageSlice, chatSlice, usersSlice, localSlice, controlSlice, midiSlice, linnSlice, patchSlice];
export const allMiddlewares = [fatalMiddleware, coverageMiddleware, chatMiddleware, loggingMiddleware];
export const middlewareInits = [coverageMiddlewareInit];

export type TotalState = {
   request: RequestState;
    notify: NotifyState;
  coverage: CoverageState;
      chat: ChatState;
     users: UsersState;
     local: LocalState;
   control: ControlState;
      linn: LinnState;
      midi: MidiState;
     patch: PatchState;
};
