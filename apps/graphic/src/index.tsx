import "reflect-metadata";
import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import GraphicApp from './GraphicApp';
import {connectRootComponent} from './actions-integration';
import {Config, Inflate} from "@therious/boot";
import {hasAll, hasAny, sleep} from '@therious/utils';
import * as Proxyable from '@therious/utils';

import './fsm/some-tests';

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
    console.info('>>>Hello');
    return `>>>hi isPrimary = ${this.isPrimary}`;
  }

}

import {
  Replicator,
  ReplicatorHub,
  ReplicatorSpoke,
  logThrottle,
  ReplicatorSpec,
} from '@therious/utils'; // imported for side effect tests for now

(async ()=>{
  try {
    const config = await Config.fetch('/config/example.yaml');
    console.warn(`config loaded`,config);
    const inflate = new Inflate(config);
    const extendedConfig = inflate.intializeSequence('bootSequence');
    console.warn(`extendedConfig `,extendedConfig);



    if(hasAll(config.queryParams, ['main']))
    {
      new ReplicatorHub();
    }
    if(hasAny(config.queryParams, ['main', 'side']))
    {
      const spoke = new ReplicatorSpoke();
      await spoke.synced;

    }

    const proxyable = Replicator.Spoke? new ExampleProxyable(!!Replicator.Hub): null;

    await sleep(100);

    if(proxyable) {
      console.warn(`>>>invoking proxyable`);
      const result = await proxyable.Hello();
      console.warn(`>>>invoked proxyable, received result`,result);
    }

    const RootComponent = connectRootComponent(GraphicApp) as unknown as React.FunctionComponent;
    const root = createRoot(document.getElementById('root')!); // createRoot(container!) if you use TypeScript
    root.render(<RootComponent/>);
  } catch(e) {
    console.error(e);
  }
})();

const report = logThrottle(10_000, (msg:string, ...rest:unknown[])=>console.log(msg, ...rest));
