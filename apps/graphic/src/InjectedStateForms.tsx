
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
      const visualizationOptions = {
        colors: {
          currentState: 'palegreen',
          nonCurrentState: 'cornsilk',
        },
        highlightCurrentState: false, // We'll handle highlighting via direct manipulation
      };
      const diagram       = fsmConfigToDot(fsmConfig, behavior, visualizationOptions);
     return <StateForm key={xstateConfig.id} expanded={true} stConfig={xstateConfig} diagram={diagram} fsmConfig={fsmConfig}/>
    });
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
      }}>
        {convertedMachines}
      </div>
    );
  }

  getDiagrams(): Array<{name: string, diagram: string}>
  {
    return Object
    .values(this.fsmConfigs)
    .map(fsmConfig=>
    {
      const behavior = {};
      const diagram = fsmConfigToDot(fsmConfig, behavior);
      return {name: fsmConfig.name || 'unnamed', diagram};
    });
  }

   static singleton()
   {
     return this.single;
   }
}

export function stateForms()
{
  // Try to get from singleton first, then try container
  let instance = InjectedStateForms.singleton();
  if (!instance) {
    try {
      instance = container.resolve<InjectedStateForms>(TokenInjectedStateForms);
      if (instance) {
        InjectedStateForms.single = instance;
      }
    } catch (e) {
      // Container might not have it yet
    }
  }
  
  if (!instance) {
    console.warn('InjectedStateForms not yet initialized');
    return <div style={{ padding: '20px', color: '#666' }}>Loading state machines...</div>;
  }
  return instance.rendering();
}

export const TokenInjectedStateForms = 'InjectedStateForms';
container.register<InjectedStateForms>(TokenInjectedStateForms, {useClass:InjectedStateForms});

