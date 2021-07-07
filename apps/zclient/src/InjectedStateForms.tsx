
import {inject, injectable, container, singleton} from 'tsyringe';
import { FsmControl, FsmDefinition, FsmInstance, FsmTransition} from './fsm-utils/fsm-control';
import React from 'react';
import {StateForm} from "@therious/components";
import {heartbeatXStateConfig} from './fsm-configs/subscription';


interface FsmConfig {
  name:         string;
  states:       string[];
  transitions:  FsmTransition[];
  context?:     Record<string,any>;
  target?:      string;
}


@singleton()
export class InjectedStateForms
{
  static single:InjectedStateForms;

  constructor(
    @inject('stateMachines') readonly fsmConfigs:Record<string,FsmConfig>
  )
  {
    console.warn(`constructing InjectedStateForms with`, fsmConfigs);
    InjectedStateForms.single = this;
  }

  rendering()
  {
    return <React.Fragment>
      {
        Object.values(this.fsmConfigs).map(
          fsmConfig=> <StateForm key={fsmConfig.name} expanded={true} stConfig={fsmConfig}/>
        )
      }
    </React.Fragment>
  }

   static singleton()
   {
     return this.single;
   }

}

export function stateForms()
{
  return InjectedStateForms.singleton().rendering();
}

export const TokenInjectedStateForms = 'InjectedStateForms';
container.register<InjectedStateForms>(TokenInjectedStateForms, {useClass:InjectedStateForms});

