
import {inject, injectable, container, singleton} from 'tsyringe';
import { FsmControl, FsmDefinition, FsmInstance, FsmTransition} from './fsm-utils/fsm-control';
import {createXStateConfiguration} from './fsm-utils/convert';
import React from 'react';
import {StateForm} from "@therious/components";


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
    const convertedMachines = Object.values(this.fsmConfigs).map(fsmConfig=>createXStateConfiguration(fsmConfig,{}));

    return <React.Fragment>
      {
        convertedMachines.map(
          xstateConfig=> <StateForm key={xstateConfig.id} expanded={true} stConfig={xstateConfig}/>
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

