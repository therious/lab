
import {inject, injectable, container, singleton} from 'tsyringe';

@singleton()
export class TestClass
{
  constructor(@inject('TestClassParams') readonly testClassParams:any)
  {
    console.warn(`constructing TestClass with`, testClassParams);
  }

}
export const TokenTestClass = 'TestClass';
container.register<TestClass>(TokenTestClass, {useClass:TestClass});

