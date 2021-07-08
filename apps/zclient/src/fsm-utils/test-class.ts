
import {inject, container, singleton} from 'tsyringe';
import { FsmControl, FsmDefinition, FsmInstance, FsmTransition} from './fsm-control';


 interface FsmConfig {
  name:         string;
  states:       string[];
  transitions:  FsmTransition[];
  context?:     Record<string,any>;
  target?:      string;
}

//todo some code that needs a home
// export const securityLightGuards = {
//   daylight: (ctx,evt)=>ctx.ambientLight > 0.5,
//   dimlight: (ctx,evt)=>ctx.ambientLight < 0.5,
// }
//

//todo some code that needs a home
// const behaviors = {
//   // enter:                'logEntry',
//   // exit:                 'logExit',
//   enterNoMemoryMaps:    errorAlert,
//   enterUnmapped:        errorAlert,
//   enterNoFile:          'retry subscribe after delay',
//   enterCorruptionError: restartUic,
//   enterToast:           restartUic,
//   enterMapped:          'subscribe'
// }


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

