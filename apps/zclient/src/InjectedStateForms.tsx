
import {inject, container, singleton} from '@therious/boot';
import {
  createXStateConfiguration,
  fsmConfigToPlantUml as fizbinToPlantUml,
  FsmTransition
} from '@therious/fsm';
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

    const fsmConfigsArray = Object.values(this.fsmConfigs);
    const convertedMachines = fsmConfigsArray.map(fsmConfig=>createXStateConfiguration(fsmConfig,{}, {}));

    const firstConfig = fsmConfigsArray[0];
    const behavior = {};
    const plantUml = firstConfig? fizbinToPlantUml(firstConfig, behavior): '** no machines **';

    return <React.Fragment>
      <textarea readOnly={true} value={plantUml}/>

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

