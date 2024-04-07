import {FsmControl } from './fsm-control';
import {FsmEvent, FsmConfig, FsmDefinition, FsmInstance} from './fsm-types';
import {fsmConfigToPlantUml } from './fsm-visualization';

import {reqIdGenerateInternal, reqIdDescribe} from '@therious/utils';

export type FsmTestArray = Array<string|number|{type:string}>

export class FsmTest
{
  private readonly  fsmdef:FsmDefinition;
  private readonly fsminst:FsmInstance;
  private readonly promise: Promise<void>;
  private umlText: string;
  constructor(
  readonly fsmConfig:FsmConfig,
  readonly testEvents: FsmTestArray,
  readonly behavior:any
  )
  {
    this.fsmdef = FsmControl.define(fsmConfig, behavior, {logGuard:null, logUpdates:'@!!! update'});
    this.umlText = fsmConfigToPlantUml(this.fsmConfig);
    this.fsminst = FsmControl.instantiate(this.fsmdef);
    this.promise = this.test();


  }
  async test()
  {
    const fsmInst = this.fsminst;
    const advance = async  (token:number|string|string|FsmEvent)=>{
      const {since} = reqIdDescribe(reqIdGenerateInternal());
      const p = fsmInst.state;
    };
  }



}
