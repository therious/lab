import {ConfigSingleton} from './config';
import {container} from 'tsyringe';

const registeredSequences:Record<string, any> = {};

// todo need a way to mark nested properties to be made into injectable tokens in their own right
// doing it only at the top level creates a difficulty enforcing specific json-schema on the configuration
// example: putting state machines inside a statemachine property allows the schema for statemachines to be enforced
// so we need a way to know that sometimes rather than making a injectable, we want to make a's properties injectable, presumably with
// an a.prefix in the name to prevent token collisions

// perhaps giving it a magic property in the schema as a cue? Those could be built into the json schema also
// or giving it a ma
// example
/*

'!stateMachines':
  '#level':
  abc: asdf
  def: asdf


better idea, have a single magic property which lists which nested properties should be made into
injectable values in their own right (using the fully qualified names a.b.c)

example

tokens:
  - stateMachines
  - something.else.entirely #while look for nested values something.else.entirely.xxx and make each of them a injectable

 */


export class Inflate {
  private extendedConfig:ConfigSingleton;
  constructor(private config:ConfigSingleton) {
    this.extendedConfig = {...config};
    this.registerTokens();
  }

  registerTokens()
  {
    // all top level properties are injectable
    Object.entries(this.config).forEach(([k,v])=>{
      console.warn(`+registering token ${k}`,v);
      this.registerValue(k,v);
    });

    // but if there is a top level property called tokens, then every string therein, tells us to make tokens of every property
    // beneath each string

    const tokens = this.config.tokens;
    if(tokens && tokens.length)
    {
      tokens.forEach((k:string)=>{
        try {
          const parts = k.split('.');
          let v: any = this.config;
          for (let i = 0; i < parts.length; ++i) {
            const k = parts[i];
            v = v[k];
          }
          console.warn(`+registering token ${k}`,v);
          this.registerValue(k,v);
        } catch(e) {
          console.error(`inflate.registerTokens fails for ${k}`, e);
        }

      });

    }
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

