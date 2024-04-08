export type TopicBusMessage<T=any>  = {topic:string, value:T };
export type TopicBusListener<T=any> = { (message:TopicBusMessage<T>):void };

export class TopicBus {
  private static instance?: TopicBus;
  public static get Instance(): TopicBus {
    if(!this.instance) this.instance = new TopicBus();

    //@ts-ignore
    globalThis.TopicBus = TopicBus;
    return this.instance!
 }  // put in proper singleton pattern

  private listeners    = new Map<string, TopicBusListener[]>();
  private writeChannel = new BroadcastChannel('TopicBus');  // write channel sends, (read here wouldn't get the writes)
  private readChannel  = new BroadcastChannel('TopicBus');  // reads msgs from this and all other same domain processes

  private broadcastChannelListener = (event: MessageEvent<TopicBusMessage>) => {

    const message = event.data;

    if(!message.topic)
      return;
    console.log(`>>>listener found`, message, event)

    const listeners = this.listeners.get(message.topic);
    if(!listeners) return;
    for(let i = 0; i < listeners.length; i++) { // todo exception handler around this
      try {
        listeners[i](message);
      } catch (e) {
        console.error(`error executing listener[${i}] in broadcastChannelListener`, message, e);
      }
    }
  }

  // todo make a singleton
  protected constructor() {
    this.readChannel.onmessage  = this.broadcastChannelListener;   // receive from same process ( rw cannot get messages it sends)
  }

  public addTopicListener<T>(topic: string, listener: TopicBusListener<T>) {
    let handlers = this.listeners.get(topic);
    if (!handlers) this.listeners.set(topic, [listener]);
    else handlers.push(listener);
  }

  public clearTopic(topic: string) {
    this.listeners.delete(topic); // this means unubscribeAll!
  }

  public removeTopicListener<T>(topic: string, listener: TopicBusListener<T>) {
    let listeners = this.listeners.get(topic);
    if (!listeners) return;

    const nListeners = listeners.filter(v => v !== listener);
    if (nListeners.length > 0) this.listeners.set(topic, nListeners);
    else this.listeners.delete(topic);
  }

  public publish<T>(topic:string, value:T)
  {
    const message:TopicBusMessage<T> = {topic:topic, value};
    this.writeChannel.postMessage(message);
  }
}
