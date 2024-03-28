import {FsmControl,  FsmDefinition, FsmInstance, FsmEvent, FsmTransition} from './fsm-control';
import {reqIdDescribe,reqIdGenerate} from '@therious/boot';

export type FsmConfig = {
  name:         string;
  states:       string[];
  transitions:  FsmTransition[];
  context?:     Record<string, any>;
  target?:      string;
}


export type FsmTestArray = Array<string | number | {type: string}>

function sleep(ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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


export class FsmTest
{
  private readonly fsmdef:FsmDefinition;
  private readonly fsminst:FsmInstance;
  private readonly promise: Promise<void>;

  constructor(
   readonly fsmConfig:FsmConfig,
   readonly testEvents: FsmTestArray,
   readonly behavior: any
  )
  {
    console.warn(`constructing TestClass with`, fsmConfig, testEvents);
    this.fsmdef = FsmControl.define(fsmConfig,behavior,{logGuards:null, logUpdates:'@!!! update'});
    this.fsminst = FsmControl.instantiate(this.fsmdef);
    this.promise = this.test();
  }

  async test()
  {
    const fsmInst = this.fsminst;

    const advance = async (token:number|string|FsmEvent)=>{

      const {since} = reqIdDescribe(reqIdGenerate());
      const p = fsmInst.state;
      console.warn(`!!! ${since} ${this.fsmConfig.name} - advance:`,token)

      if(typeof token === 'number')
        return sleep(token)
      // otherwise it is a bonafide event
      fsmInst.send(token);
      const s = fsmInst.state;
      console.warn(`!!! ${since} ${this.fsmConfig.name} - pstate = ${p.value} state=${s.value}`, token, s.context);
    };

    // for await is not working in some contexts, but this for statement should work due to no callbacks
    // forEach would not work
    for (let token of this.testEvents)
      await advance(token);
  }

}

