import {TopicBus, TopicBusMessage} from '../topic-bus';
import {sleep} from '../sleep';
import {expect, describe, test, vi} from 'vitest'

describe('TopicBus', async () => {

  test('send to same process', async()=>{

    const bus = TopicBus.Instance;
    expect(bus).toBeInstanceOf(TopicBus);

    const tb2 = TopicBus.Instance;
    expect(tb2).toBe(bus);

    const testTopic = 'test-topic';
    const sMessage = 'hello world!';

    const handler  = vi.fn((msg:TopicBusMessage<string>)=>
    {
      console.log(`in handler1`);
      expect(msg.topic).toBe(testTopic)
      expect(msg.value).toBe(sMessage)
    } );
    const handler2 = vi.fn((msg:TopicBusMessage<string>)=>
    {
      console.log(`in handler2`);
      expect(msg.topic).toBe(testTopic)
      expect(msg.value).toBe(sMessage)
    } );

    // add two listeners
    bus.addTopicListener(testTopic, handler);
    bus.addTopicListener(testTopic, handler2);

    bus.publish<string>(testTopic, sMessage);
    await sleep(0); // if we don't exit execution, then handler cannot receive message

    expect(handler).toHaveBeenCalledOnce();

    await sleep(0); // if we don't exit execution, then handler cannot receive message
    expect(handler2).toHaveBeenCalledOnce();

    // do a second oround
    bus.publish<string>(testTopic, sMessage);
    await sleep(0); // if we don't exit execution, then handler cannot receive message

    expect(handler).toHaveBeenCalledTimes(2);

    await sleep(0); // if we don't exit execution, then handler cannot receive message
    expect(handler2).toHaveBeenCalledTimes(2);


    bus.removeTopicListener(testTopic, handler);
    bus.clearTopic(testTopic)
    bus.publish<string>(testTopic, sMessage);

    await sleep(0);

    expect(handler).toHaveBeenCalledTimes(2); // no increase in calls
  });
});
