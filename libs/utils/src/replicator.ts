import {TopicBus, TopicBusMessage} from './topic-bus';
import {reqIdGenerate} from './snowflake';
import {CreateExternalPromise, ExternalPromise} from './external-promise';

type regType = string;
type regId = string;

export type ReplicatorInfo = {type:regType, id?:regId};
export type ReplicatorSpec = regType | ReplicatorInfo;

type ReplicatorKey      = `${regType}-${regId}`;
type ReplicatorMessage<T> = {key:ReplicatorKey, value:T};

export const specToInfo = (spec:ReplicatorSpec):ReplicatorInfo => (typeof spec !== 'string')?spec: {type:spec};
export const infoToKey  = (info:ReplicatorInfo):ReplicatorKey  => `${info.type}-${info.id ?? ''}`;
export const specToKey  = (spec:ReplicatorSpec):ReplicatorKey  => infoToKey(specToInfo(spec));

type ReplicatorTopic = `model:${'Snapshot'|'Update'|'GetSnapshot'|'SetItem'}`;

const Topic:Record<string, ReplicatorTopic> =
  {
    Snapshot:     `model:Snapshot`,
    Update:       `model:Update`,
    GetSnapshot:  `model:GetSnapshot`,
    SetItem:      `model:SetItem`,
} as const;

type ObserverHandler = (update:any)=>void;
type Observer = unknown;
type ObserverHandlerPair =  {observer:Observer, handler:ObserverHandler};

interface IObserverForwarder
{
  addObserver(observer:Observer, spec:ReplicatorSpec, handler:ObserverHandler):void;
  removeObserver(observer:Observer):void;
  forwardUpdate({key, value}:ReplicatorMessage<unknown>):void;
}
class ObserverForwarder implements IObserverForwarder {
  protected observers: Set<Observer> = new Set();
  protected observerHandlers: Map<ReplicatorKey, Set<ObserverHandlerPair>> = new Map();

  public addObserver(observer:Observer, spec:ReplicatorSpec, handler:ObserverHandler):void {

    this.observers.add(observer); // tracking observers themselves for debugging only

    const key = specToKey(spec);
    const value:ObserverHandlerPair = {observer, handler};
    const handlerSet = this.observerHandlers.get(key);
    if(handlerSet !== undefined) handlerSet.add(value);
    else this.observerHandlers.set(key, new Set([value]));
  }

  public removeObserver(observer: Observer) {
    this.observers.delete(observer);
    this.observerHandlers.forEach((handlerSet)=>
      Array
      .from   (handlerSet)
      .filter (pair=>observer === pair.observer)
      .forEach(pair=>handlerSet.delete(pair))
    );
  }

  public forwardUpdate({key, value}:ReplicatorMessage<unknown>)
  {
    const handlerSet = this.observerHandlers.get(key);
    if(!handlerSet) return;
    const iterator: IterableIterator<ObserverHandlerPair> = handlerSet.values();
    for(let n = iterator.next(); !n.done; n = iterator.next()) {
      const pair = n.value;
      pair.handler(value); // execute the handler
    }
  }

}

export abstract class Replicator implements IObserverForwarder {
  public static count:  number = 0;
  protected instanceId: number;
  protected static spoke?:ReplicatorSpoke;
  protected static hub?:ReplicatorHub;

  public static get Spoke():Replicator { return this.spoke! }
  public static get Hub()  :Replicator { return this.hub!   }

  protected map:        Map<ReplicatorKey, unknown>;
  protected forwarder:  IObserverForwarder;
  protected bus:        TopicBus;

  protected constructor() {
    this.instanceId = ++Replicator.count;
    this.map        = new Map();
    this.forwarder  = new ObserverForwarder();
    this.bus        = TopicBus.Instance;
  }
  protected createSnapshotTopic():string
  {
    return `${Topic.Snapshot}-[${this.instanceId}]-${reqIdGenerate()}`;
  }

  public hasItem(spec:ReplicatorSpec):boolean
  {
    return this.map.has(specToKey(spec));
  }

  public getItem<T>(spec:ReplicatorSpec):T
  {
    const key = specToKey(spec);
    return this.map.get(key) as T
  }

  public setItem<T>(spec:ReplicatorSpec, value:T):void
  {
    const key = specToKey(spec);
    this.bus.publish<ReplicatorMessage<T>>(Topic.SetItem, {key, value});
  }

  public addObserver(observer: Observer, spec: ReplicatorSpec, handler: ObserverHandler): void {
    this.forwarder.addObserver(observer,spec, handler);
  }

  public forwardUpdate({key, value}: ReplicatorMessage<unknown>): void {
    this.forwarder.forwardUpdate({key, value});
  }

  public removeObserver(observer: Observer): void {
    this.forwarder.removeObserver(observer);
  }
}

export class ReplicatorHub extends Replicator {
  public constructor() {
    super();
    Replicator.hub = this;
    this.map.set("ReplicatorHub-","I am here");

    //@ts-ignore
    globalThis.Hub = this;

    this.bus.addTopicListener(Topic.SetItem, this.onSet);
    this.bus.addTopicListener(Topic.GetSnapshot, this.onAsk);
    //@ts-ignore (since there is no package privilege access private explicitly here)
  }

  /*
    A GetSnapshot message requesting a snapshot provides a unique topic to which to publish snapshots
    So that other instances of a registry ned not see/ignore an unnecessary dump of values
    in a series of snapshot messages, the sender of the Ask message is probably the only one subscribing
    how to reognize the final snapshot message would be an endsnap marking the last message or something
   */
  private onAsk = (message:TopicBusMessage<string>) =>
  {
    const topic = message.value;
    const entries = Array.from(this.map.entries());
    entries.forEach(([key,value]) =>{
      this.bus.publish<ReplicatorMessage<unknown>>(topic, {key, value});
    });
  }

  private onSet = (message:TopicBusMessage<ReplicatorMessage<unknown>>) =>
  {
    const {key, value} = message.value;

    if(this.map.get(key) === value) // don't set same value redundantly
      return;
    this.map.set(key,value);
    this.bus.publish<ReplicatorMessage<unknown>>(Topic.Update, message.value);
  }
}

export class ReplicatorSpoke extends Replicator {
  private readonly snapshotTopic:string;

  public readonly synced: ExternalPromise<void> = CreateExternalPromise<void>();

  public constructor() {
    super();
    this.snapshotTopic = this.createSnapshotTopic();
    this.bus.addTopicListener(this.snapshotTopic, this.onSnapshot);
    this.bus.addTopicListener(Topic.Update, this.onUpdate);
    if(!Replicator.Spoke) {
      (Replicator as any).spoke = this;
      //@ts-ignore
      globalThis.Spoke = this;
    }
    this.bus.publish<string>(Topic.GetSnapshot, this.snapshotTopic);
  }

  private onUpdate = (message:TopicBusMessage<ReplicatorMessage<unknown>>)=>
  {
    const {key,value}= message.value;
    this.map.set(key,value);
    this.forwarder.forwardUpdate(message.value);
  }
  private onSnapshot = (message:TopicBusMessage<ReplicatorMessage<unknown>>) =>
  {
    this.onUpdate(message);
    this.bus.clearTopic(this.snapshotTopic);
    this.synced.resolve();
  }

}

