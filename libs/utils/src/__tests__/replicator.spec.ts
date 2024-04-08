import {sleep} from '../sleep';
import {Replicator, ReplicatorHub, ReplicatorSpoke, ReplicatorSpec} from '../replicator';
import {expect,describe, test, beforeAll} from 'vitest'

const info = console.info;

type TestGlobals = {
 hub: Replicator;
 satellite1: Replicator;
 satellite2: Replicator;
};

//@ts-ignore
const testGlobals:TestGlobals = {};

const key1 = 'blah';
const key2 = 'bar';
const info1  = {type:key2, id:'1'};
const info2  = {type:key2, id:'2'};


const compare = async <T extends unknown>(spec:ReplicatorSpec, value:T)=>
{
  await sleep(0);
  const itemA = testGlobals.hub.getItem(spec);
  const itemB = testGlobals.satellite1.getItem(spec);
  const itemC = testGlobals.satellite2.getItem(spec);

  info(`compare the value ${value}`);
  expect(itemA).toEqual(itemB);
  expect(itemA).toEqual(itemC);

}


describe('GlobalRegistry', async () => {
  beforeAll(async ()=>{
    testGlobals.hub = new ReplicatorHub();
    testGlobals.satellite1 = new ReplicatorSpoke();
    testGlobals.satellite2 = new ReplicatorSpoke();
  });

  test('replication', async ()=>{
    testGlobals.hub.setItem<number>(key1, 1);
    await compare(key1, 1);
  });

});

