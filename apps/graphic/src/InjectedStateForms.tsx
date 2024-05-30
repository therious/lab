
import {inject, container, singleton} from '@therious/boot';
import {createXStateConfiguration, fsmConfigToDot, FsmConfig} from '@therious/fsm';
import {StateForm} from "@therious/components";
import React from 'react';

@singleton()
export class InjectedStateForms
{
  static single:InjectedStateForms;

  constructor(@inject('stateMachines') readonly fsmConfigs:Record<string,FsmConfig>)
  {
    console.warn(`constructing InjectedStateForms with`, fsmConfigs);
    InjectedStateForms.single = this;
  }

  rendering()
  {
    const convertedMachines = Object
    .values(this.fsmConfigs)
    .map(fsmConfig=>
    {
      const behavior      = {};
      const options       = {};
      const xstateConfig  = createXStateConfiguration(fsmConfig, behavior, options);
      const diagram       = fsmConfigToDot(fsmConfig, behavior);
     return <StateForm key={xstateConfig.id} expanded={true} stConfig={xstateConfig} diagram={diagram}/>
    });
    return <>{convertedMachines}</>
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

