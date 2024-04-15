import {sleep} from '../sleep';
import {Replicator, ReplicatorHub, ReplicatorSpoke, ReplicatorSpec} from '../replicator';
import {expect,describe, test, beforeAll} from 'vitest'

const info = console.info;

type TestGlobals = {
 hub: ReplicatorHub;
 spoke1: ReplicatorSpoke;
 spoke2: ReplicatorSpoke;
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
  const itemB = testGlobals.spoke1.getItem(spec);
  const itemC = testGlobals.spoke2.getItem(spec);

  info(`compare the value ${value}`);
  expect(itemA).toEqual(itemB);
  expect(itemA).toEqual(itemC);

}


describe('Replicator', async () => {
  beforeAll(async ()=>{
    testGlobals.hub = new ReplicatorHub();
    await sleep(0);
    testGlobals.spoke1 = new ReplicatorSpoke();
    await sleep(0);

    // await testGlobals.spoke1.synced;

    testGlobals.spoke2 = new ReplicatorSpoke();
    await sleep(0);

    // await testGlobals.spoke2.synced;

  });

  test('replication', async ()=>{
    testGlobals.hub.setItem<number>(key1, 1);
    await compare(key1, 1);
  });

});

