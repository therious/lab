import {expect, describe, test} from 'vitest'
import {reqIdGenerateInternal, reqIdDescribe, isSnowflakeId, SnowflakeId} from '../snowflake';

function setCharAt(str:string,index:number,chr:any) {
  if(index > str.length-1) return str;
  return str.substring(0,index) + chr + str.substring(index+1);
}

describe('snowflakeId',  () => {

  test('reqIdGenerate', ()=>{
    const id = reqIdGenerateInternal();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(36);
    console.log(reqIdDescribe(id));
  });

  test('sorting', ()=> {
    // create a set of ids
    const ids = <SnowflakeId[]>[];
    for(let i = 0; i < 102; ++i)
    {
      const id = reqIdGenerateInternal() as SnowflakeId;
      expect(isSnowflakeId(id)).toBe(true);
      ids.push(id);
    }
    // a reversed, then sorted version should be in same order that we generated them
    expect(ids).toEqual([...ids].reverse().sort());
  });

  test('isSnowflakeId', ()=> {
    const id = reqIdGenerateInternal();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(36);

    expect(isSnowflakeId(id)).toBe(true);
    for (let i = 0; i < id.length; ++i)
    {
      const id2 = setCharAt(id, i, 'A');
      expect(isSnowflakeId(id2)).toBe(false);
    }

  });

});
