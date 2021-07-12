
import {inject, container, singleton} from 'tsyringe';
import { FsmTest } from './fsm-test';

// todo come up with a way to instantiate multiples directly from configuration without need for subclassing

class SecLightBehavior {
  readonly aSecLight: string;
  constructor() {
    this.aSecLight= "I'm a light";
  }
  entry(c:any,e:any,m:any){
    console.log('entry',c,e,m);
  }
  entryOn(c:any,e:any,m:any) {
    console.log('entryOn',c,e,m);
  }
  exitOn(c:any,e:any,m:any) {
    console.log('exitOn',c,e,m);
  }
  entryNight(c:any,e:any,m:any) {
    console.log('entryNight',c,e,m);
  }
  exitNight(c:any,e:any,m:any) {
    console.log('exitNight',c,e,m);
  }
  entryDay(c:any,e:any,m:any) {
    console.log('entryDay',c,e,m);
  }
  exitDay(c:any,e:any,m:any) {
    console.log('exitDay',c,e,m);
  }


}

@singleton()
export class SecurityTest extends FsmTest
{
  constructor(
    @inject('stateMachines.securityLight') readonly fsmConfig: any,
    @inject('testEvents.securityLight') readonly testEvents: any,
  )
  {
    super(fsmConfig,testEvents, new SecLightBehavior());
  }

}
export const TokenSecurityTest = 'SecurityTest';
container.register<SecurityTest>(TokenSecurityTest, {useClass:SecurityTest});

@singleton()
export class SubscriptionTest extends FsmTest
{
  constructor(
    @inject('stateMachines.subscription') readonly fsmConfig: any,
    @inject('testEvents.subscription') readonly testEvents: any
  )
  {
    super(fsmConfig,testEvents,{});
  }

}
export const TokenSubscriptionTest = 'SubscriptionTest';
container.register<SubscriptionTest>(TokenSubscriptionTest, {useClass:SubscriptionTest});

