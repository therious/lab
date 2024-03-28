import {createXStateConfiguration} from './fsm-convert';
import {FsmConfig, FsmDefinition, FsmInstance} from './fsm-types';
import {createMachine, interpret, MachineConfig} from 'xstate';

export class FsmControl
{
  static define(config:FsmConfig, behavior:unknown, options:unknown):FsmDefinition
  {
    const xstateConfig = createXStateConfiguration(config,behavior,options) as MachineConfig<any,any,any>;
    const fsm = createMachine(xstateConfig,{});
    return fsm;
  }
  static instantiate(fsm:FsmDefinition, start:boolean = true):FsmInstance
  {
    const interpreter = interpret(fsm);
    interpreter.start()
    return interpreter;
  }
}
