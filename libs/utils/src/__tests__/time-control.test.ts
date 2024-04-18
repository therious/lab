import {strToRaw, cook} from '../time-control-regex';

import {expect, describe, test} from 'vitest'

console.clear();

const tests = {
  absolute:         "60m",
  simple:           "r1/30s",
  mainPlusByoyomi:  "90m, 6 x r1/60s",
  mainPlusCanadian: "60m, r10/15m",
  fischer:          "30m.. + 3m",
  fide:             "40/90m+30s, 30m..+30s",
  capfischer:       "60m..120m + 2m",
  capfischer2:      "10m + 30s",
  usdelay:          "(5s) 120m",
  bronstein:        "30m + ..10s",
  steady:           "10/r5m"
};




describe('time-control',  () => {

  test('test1', () => {

    let i = 0;
    let j = 0;

    Object.entries(tests).forEach(([k, v]) => {
      ++i;
      const raw = strToRaw(v);

      if (raw) {
        ++j;
        const cooked = cook(raw);
        console.info(k, v, 'raw:', raw, 'cooked:', cooked);
      }
    });
    console.info(`${j}/${i} matches found`);

  });
});
