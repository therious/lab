import {sleep} from '../sleep';
import {ReplicatorHub, ReplicatorSpoke, ReplicatorSpec} from '../replicator';
import {expect,describe, test, beforeAll} from 'vitest'
import * as Proxyable from '../proxyable';


class ExampleProxyable implements Proxyable.NamedInstance
{
  getSpec(): ReplicatorSpec { return `ExampleProxyable`; }
  public static proxyHandler: Proxyable.Handler<ExampleProxyable> = new Proxyable.Handler<ExampleProxyable>(ExampleProxyable, 400);
  protected isPrimary:boolean;

  constructor(isPrimary:boolean) {
    this.isPrimary = isPrimary;
    const proxy = Proxyable.register<ExampleProxyable>(this, ExampleProxyable.proxyHandler, isPrimary);
    if(proxy)
      return proxy;
  }

  async Hello()
  {
    return `hi isPrimary = ${this.isPrimary}`;
  }

}


describe('Proxyable', async () => {
  beforeAll(async ()=>{
    // these will create global singletons at GlobalRegistry.Hub and .Satellite
    new ReplicatorHub();
    new ReplicatorSpoke();
  });

  test('proxyable', async()=>{

    const a:ExampleProxyable = new ExampleProxyable(true);
    const b:ExampleProxyable = new ExampleProxyable(false);

    await sleep(0);

    const result = await b.Hello();

    expect(result).toEqual(`hi isPrimary = true`);
  })

});

