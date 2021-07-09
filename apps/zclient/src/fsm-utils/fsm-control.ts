import {createXStateConfiguration} from './convert';
import {createMachine, interpret,
  Interpreter, StateMachine,
  EventObject, EventData, EventType, MachineConfig} from 'xstate';

export interface FsmTransition {
  from:   string | string[];
  to:     string;
  evt?:   string;
  cond?:  string;
  after?: number;
}

export type FsmConfig = {
  name:         string;
  states:       string[];
  transitions:  FsmTransition[];
  context?:     Record<string, any>;
  target?:      string;
}

type FsmContext      = any;
type FsmStateSchema  = any;
// type FsmTypestate    = any;

export type FsmEvent = EventObject;


export type FsmDefinition = StateMachine<FsmContext, FsmStateSchema, FsmEvent>;
export type FsmInstance = Interpreter<FsmContext, FsmStateSchema, FsmEvent>;

export class FsmControl
{
  static define(config:FsmConfig, behavior:any): FsmDefinition
  {
     const xstateConfig = createXStateConfiguration(config,behavior) as MachineConfig<any,any,any>;
     console.warn(`!!! xstateConfig`, xstateConfig);

     const fsm = createMachine(xstateConfig, {});
     return fsm;
  }

  static instantiate(fsm:FsmDefinition):FsmInstance
  {
    const interpreter = interpret(fsm);
    interpreter.start();
    return interpreter;
  }


}