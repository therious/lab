import {hasAll, hasAny} from '../has';
import {expect, describe, test, vi} from 'vitest'

describe('has',  () => {

  test('hasAny', ()=>{

    const o:any = {a: null, b: undefined ,c: "", x:1, y:'hi', z:0 };

    const keys = Object.keys(o);
    expect(hasAll(o, keys)).toBe(true);
    expect(hasAny(o, keys)).toBe(true);

    for(let i = 0; i < keys.length; ++i) {
      const subkeys = keys.filter((k, index)=>index !== i);
      const o2 = {...o};
      delete o2[keys.filter((k, index)=>index === i)[0]]

      expect(hasAll(o2, keys)).toBe(false);
      expect(hasAny(o2, subkeys)).toBe(true);
    }

  });
});
