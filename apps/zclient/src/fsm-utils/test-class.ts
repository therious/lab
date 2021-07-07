
import {inject, injectable, container, singleton} from 'tsyringe';
import { FsmControl, FsmDefinition, FsmInstance, FsmTransition} from './fsm-control';


 interface FsmConfig {
  name:         string;
  states:       string[];
  transitions:  FsmTransition[];
  context?:     Record<string,any>;
  target?:      string;
}


@singleton()
export class TestClass
{
  private fsmdef:FsmDefinition;
  private fsminst:FsmInstance;

  constructor(
    @inject('TestClassParams') readonly testClassParams:any,
    @inject('stateMachines.securityLight') readonly fsmConfig:FsmConfig
  )
  {
    console.warn(`constructing TestClass with`, testClassParams, fsmConfig);
    this.fsmdef = FsmControl.define(fsmConfig,{});

    const fsmInst = this.fsminst = FsmControl.instantiate(this.fsmdef);


    const advance = (token:string)=>{
      const p = fsmInst.state;
      fsmInst.send(token);
      const s = fsmInst.state;
      console.warn(`!!! pstate = ${p.value} state=${s.value}`, s.context);
    };

    ['motion','motion'].forEach(advance);

  }

}
export const TokenTestClass = 'TestClass';
container.register<TestClass>(TokenTestClass, {useClass:TestClass});

