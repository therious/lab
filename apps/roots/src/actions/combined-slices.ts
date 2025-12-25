// -- standard slices --
import {requestSlice,RequestState, notifySlice,NotifyState, loggingMiddleware, fatalMiddleware} from "@therious/actions";
import {sliceConfig as optionsSlice,OptionsState} from "./options-slice";

// -- app specific slices --
import {sliceConfig as localSlice, LocalState} from "./local-slice";
import {sliceConfig as gridSlice, GridState} from "./grid-slice";
import {sliceConfig as visualizationSlice, VisualizationState} from "./visualization-slice";


//-- app specific middlewares


export const allSlices = [requestSlice, notifySlice, localSlice, optionsSlice, gridSlice, visualizationSlice];
export const allMiddlewares = [ fatalMiddleware, loggingMiddleware];
export const middlewareInits:any[] = [  ];

// when I get smarter about deriving types in typescript I can presumably fix this (he claims)
// but the important thing is it makes every part of state known
//There is a source of truth problem, I need to derive the keys from the slice names directly encountered issues
// with non-literals
export type TotalState = {
   request: RequestState;
    notify: NotifyState;
     local: LocalState;
   options: OptionsState;
    grid: GridState;
    visualization: VisualizationState;
}

