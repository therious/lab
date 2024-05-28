import {bsearch} from '../binary-search';
import {expect, describe, test} from 'vitest'

describe('binary-search',  () => {

  test('bsearch', ()=>{

    type Tr = [want:number,arr:number[], result:number];
    const cases:Tr[] = [
      // failing cases
      [3,[],-1], [3,[0], -1], [3,[0,1],-1], [3,[0,1,2],-1], [3,[0,1,2,4,5],-1], [3, [0,1,2,4,5,6],-1],

      // succeeding cases
       [3,[3],0], [3,[0,3],1], [3,[0,1, 3,4],2],
       [3,[0,1,2,3,4],3], [3,[0,1,2,3,4,5,6],3],
       [3,[0,1,2,3,4,5,6,7,8,9,10,11,12],3],
       [144, [1, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 634],9],
       [11,[1, 3, 4, 6, 8, 9, 11], 6]
    ];

    cases.forEach(tc=>
    {
      const [want, arr, index] = tc;
      console.log(`wanted value ${want} is expected at index[${index}] for`, arr);
      const result = bsearch<number>(arr, want);
      expect(result).toBe(result);
    });


  });
});


