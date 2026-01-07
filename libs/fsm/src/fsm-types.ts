import {createMachine, interpret, Interpreter, StateMachine, MachineConfig, AnyEventObject} from 'xstate';

export interface FsmTransition {
  from: string | string[];
  to: string;
  evt?: string;   // todo, make at least one of these properties mandatory so they cannot all be left out
  cond?: string;
  after?: number;
}
export interface FsmNormalizedTransition {
  from: string;
  to: string;
  evt?: string;   // todo, make at least one of these properties mandatory so they cannot all be left out
  cond?: string;
  after?: number;
}



export type FsmConfig = {
  name:string;
  start?:string;
  states:string[];
  transitions: FsmTransition[];
  context?: Record<string, any>;
  target?: string;  // this has to be one of the states
}

export type FsmContext = any;
export type FsmStateSchema = any;
export type FsmEvent = AnyEventObject;

export type FsmDefinition = StateMachine<FsmContext, FsmStateSchema, FsmEvent>;
export type FsmInstance = Interpreter<FsmContext, FsmStateSchema, FsmEvent>;

export interface ee { entry:any[]; exit:any[]}

export interface FsmVisualizationOptions {
  colors?: {
    currentState?: string;      // Default: 'palegreen'
    nonCurrentState?: string;   // Default: 'cornsilk'
    transitionHighlight?: string; // For animation: 'yellow' or 'orange'
    transitionPath?: string;     // For animation: 'blue' or 'cyan'
  };
  highlightCurrentState?: boolean; // Default: true
}
