import {ConfigSingleton} from './config';
import {container} from 'tsyringe';

const registeredSequences:Record<string, any> = {};

export class Inflate {
  private extendedConfig:ConfigSingleton;
  constructor(private config:ConfigSingleton) {
    this.extendedConfig = {...config};
    this.applyInitializers();
  }

  applyInitializers()
  {
    Object.entries(this.config).forEach(([k,v])=>{
      this.registerValue(k,v);
    })
  }

  private registerValue(name:string, useValue:any)
  {
    container.register(name, {useValue})
    container.beforeResolution(name, (token)=>console.warn(`resolving ${token as string}`));
  }

  public intializeSequence(sequenceName:string):ConfigSingleton
  {
    const config = this.extendedConfig;
    const sequence = config[sequenceName] || config.sequence[sequenceName] as string;
    const tokenToUse:Record<string, any> = {};

    if(!registeredSequences[sequenceName])
    {
      registeredSequences[sequenceName] = true;
      sequence.forEach((fqToken:string)=>{
        const parts = fqToken.split(':');
        if(parts.length < 1) {
          console.warn(`+++just in time registering token ${parts[1]} maps to token ${parts[0]}`);
          container.register(parts[1], {useToken:parts[0]});
          tokenToUse[fqToken]= parts[1];

        } else {
          tokenToUse[fqToken]=fqToken;
        }
      });

    }
    if(sequence) {
      sequence.forEach((fqToken:string)=>{
        const token = tokenToUse[fqToken];
        console.warn(`+++bootstrapping toekn ${fqToken} using ${token}`);
        const value = container.resolve(token);
        console.warn(`value`, value);
        const alreadyKnown = config[token];
        if(!alreadyKnown) {
          // @ts-ignore
          config[token] = value;
          console.log(`...added to config`);
        }


      });
    }
    return this.extendedConfig;
  }
}

