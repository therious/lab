import {Replicator, ReplicatorSpec, specToKey} from './replicator';
import {TopicBus, TopicBusMessage, TopicBusListener} from './topic-bus';
import {reqIdGenerateInternal} from './reqIdGenerator'
import {StringKey} from './types';

type JsonString = string;
type RemoteMethodMessage  = {method: string, args:JsonString, replyTo:string};
type RemoteMethodResponse = {response?:JsonString|undefined, error?:JsonString};

const ProxySymbol = Symbol();

export interface NamedInstance {getSpec(): ReplicatorSpec, [ProxySymbol]?:any}

export const getType    = (o:NamedInstance) =>  o[ProxySymbol] ?? o.constructor;
export const isPrimary  = (o:NamedInstance) => !o[ProxySymbol];
export const isProxy    = (o:NamedInstance) =>!!o[ProxySymbol];

function serializeError(error:unknown):JsonString
{
  let strError: JsonString;
  try {
    if(error instanceof Error) {
      const {message, stack, name} = error;
      strError = JSON.stringify({message, stack, name});
    } else strError = JSON.stringify(error);

  } catch(e) {
    strError = "Unserializable error";
  }
  return strError;
}
function deserializeError(errorStr:JsonString):unknown
{
  let error:any = "Undeserializable error";
  try {
    error = JSON.parse(errorStr);
    if(error?.message && error?.stack) {
      const tempError = new Error(error.message);
      tempError.stack = error.stack;
      if(error.name) tempError.name = error.name;
      error = tempError;
    }

  } catch {}
  return error;
}


function serializeArgs(args:unknown):JsonString|Error
{
  try {return JSON.stringify(args) } catch(e) {return e as Error}
}

export class Handler<T extends NamedInstance>
{
  private proxiedMethods?:Record<keyof T, Function>;

  public constructor(public readonly ctype:unknown, public readonly timeout:number = 0) {} /// will satisfy isPrototypeOf calls (inverse of instanceof)
  public get(target:T, propKey:StringKey<T>, /*receiver:unknown*/)
  {
    if(propKey === 'then') return (target as any)['then']?.bind(target);
    const timeOut = this.timeout;
    let proxiedMethod = this.proxiedMethods![propKey];
    if(proxiedMethod) return proxiedMethod;
    else if(!(propKey in this.proxiedMethods!)) return target[propKey];

    // generate and store a proxy version of the method, use explicit this parameter
    proxiedMethod = function(this:T, ...args:unknown[]):Promise<unknown>
    {
      return new Promise((resolve, reject)=>
      {
        const spec = this.getSpec(); // name of virtual instance
        const methodName = ` [${spec}].${propKey}`

        const topic = Replicator.Spoke.getItem<string>(spec);
        if(!topic) reject(new Error(`Primary instance not found. Proxy cannot access ${methodName}`));
        const serializedArgs = serializeArgs(args);
        if(serializedArgs instanceof Error) reject(new Error(`${methodName} error serializing arguments`))  // todo this would prevents sending an Error as an argument

        const timeoutId = timeOut > 0? setTimeout(()=>reject(new Error(`${methodName} call timed out after ${timeOut}ms` )), timeOut):null;
        const replyTo = `${topic}/${propKey}/${reqIdGenerateInternal()}`;
        const replyHandler = (message:TopicBusMessage<RemoteMethodResponse>)=> {
          const payload: RemoteMethodResponse = message?.value;
          if (timeoutId) clearTimeout(timeoutId);

          try {
            if ('response' in payload) resolve(JSON.parse(payload.response!));
            else if ('error' in payload) reject(deserializeError(payload.error!));
            else resolve(void 0);

          } catch (e) {
            //@ts-ignore //todo get compiler to recognize {cause: } second parameter in new Error
            reject(new Error(`${methodName} error parsing response or error`, {cause: payload}));
          } finally {
            TopicBus.Instance.clearTopic(replyTo);
          }
        };
        TopicBus.Instance.addTopicListener(replyTo, replyHandler);
        TopicBus.Instance.publish<RemoteMethodMessage>(topic, {method: propKey, args: serializedArgs as JsonString, replyTo});

      });
    }
    this.proxiedMethods![propKey] = proxiedMethod;
    return proxiedMethod;

  }
  // todo any point in having a setter?
  public set(target:T, propKey:keyof T, value:any)
  {
    target[propKey] = value;
    return true;
  }

  public getPrototypeOf(/*target:T*/):object | null
  {
    //@ts-ignore (T refers only to a type but a value is needed here)
    return this.ctype.prototype;
  }

  public InitializeMethodCache(target:T):Record<keyof T, Function>
  {
    if(this.proxiedMethods) return this.proxiedMethods;

    const props = Object.getOwnPropertyNames(target.constructor.prototype).filter(p=>typeof (target as any)[p] === 'function');
    const doNotProxyMethods = new Set(['constructor', 'getSpec', 'onDispose', 'dispose']);
    const filteredNames = props.filter(p=>!doNotProxyMethods.has(p));
    this.proxiedMethods = filteredNames.reduce((accum, propKey)=>{
      //@ts-ignore // todo fix this
      accum[propKey] = null;
      return accum;

    }, {} as Record<keyof T, Function>);
    return this.proxiedMethods;

  }

}

export function register<T extends NamedInstance>(instance:T, proxyHandler:Handler<T>, isPrimary:boolean, throwIfExists:boolean = true):T|undefined
{
  proxyHandler.InitializeMethodCache(instance); // generate a place to hold methods for proxies lazily
  if(!isPrimary) {
    const proxy = new Proxy(instance, proxyHandler as ProxyHandler<T>);
    proxy[ProxySymbol] = (proxyHandler.ctype as T);
    return proxy;
  } else {
    const spec = instance.getSpec();
    const priorPrimaryTopic = Replicator.Spoke.getItem<string>(spec);
    const key = specToKey(spec);
    if (throwIfExists && priorPrimaryTopic) throw new Error(`A primary for ${key} already exists`);
    if (priorPrimaryTopic) TopicBus.Instance.clearTopic(priorPrimaryTopic);

    // if primary instance is created again, use a fresh topic to prevent undisposed zombie from responding
    const topic = `remote:${key}/${reqIdGenerateInternal()}`;
    // subscribe to messages from proxy instances
    const forwardedMethodHandler: TopicBusListener<RemoteMethodMessage> = async (message: TopicBusMessage<RemoteMethodMessage>) =>
    {
      const {method,args,replyTo} = message.value;
      try {
        const deserializedArgs = JSON.parse(args);
        //@ts-ignore todo fix ignore
        const result = instance[method](...deserializedArgs);
        if(result instanceof Promise)
        {
          const resultAwaited = await result;
          // promise voids are a thing, and undefined doesn't serialize with stringify
          const response = resultAwaited === undefined ? resultAwaited : JSON.stringify(resultAwaited);
          TopicBus.Instance.publish<RemoteMethodResponse>(replyTo, {response});
        } else {
          const error = serializeError(new Error(`method ${method} must be async/return a promise`));
          TopicBus.Instance.publish<RemoteMethodResponse>(replyTo, {error});
        }
      } catch(e) {
        TopicBus.Instance.publish<RemoteMethodResponse>(replyTo,{error: serializeError(e)});
      }
    };
    TopicBus.Instance.addTopicListener(topic, forwardedMethodHandler);
    Replicator.Spoke.setItem<string>(spec, topic);
    return undefined;
  }

}

export function unregister<T extends NamedInstance>(instance: T, isPrimary:boolean, doNotResetTopic:boolean = false)
{
  if(isPrimary)
  {
    const spec = instance.getSpec();
    const topic = Replicator.Spoke.getItem<string>(spec);
    TopicBus.Instance.clearTopic(topic);
    if(!doNotResetTopic)
      Replicator.Spoke.setItem(spec, ''); // todo revisit the empty string topic
  }

}
