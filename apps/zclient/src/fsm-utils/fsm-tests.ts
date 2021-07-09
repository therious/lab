
import {inject, container, singleton} from 'tsyringe';
import { FsmTest } from './fsm-test';

// todo come up with a way to instantiate multiples directly from configuration without need for subclassing

@singleton()
export class SecurityTest extends FsmTest
{
  constructor(
    @inject('stateMachines.securityLight') readonly fsmConfig: any,
    @inject('testEvents.securityLight') readonly testEvents: any
  )
  {
    super(fsmConfig,testEvents);
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
    super(fsmConfig,testEvents);
  }

}
export const TokenSubscriptionTest = 'SubscriptionTest';
container.register<SubscriptionTest>(TokenSubscriptionTest, {useClass:SubscriptionTest});

