import {CreateExternalPromise} from '../external-promise';
import {expect,describe, test, beforeAll} from 'vitest'

const slopMillis = 10;  // allow  time to be off by 10ms on timeouts
describe('ExternalPromise', async () => {

  test('test success', async()=>{
    const ep = CreateExternalPromise<string>();
    const returnValue = 'hi';
    const delayMillis = 1000;
    setTimeout(()=>{ep.resolve(returnValue)}, delayMillis);
    const start = performance.now();
    const result = await ep;
    const end = performance.now();

    expect(result).toBe(returnValue);
    expect(end-start).toBeGreaterThanOrEqual(delayMillis-slopMillis);
  });

  test('test failure', async()=>{
    const ep = CreateExternalPromise<string>();
    const errorMessage = `planned failure`;
    const delayMillis = 1000;

    setTimeout(()=>{ep.reject(new Error(`planned failure`))}, delayMillis);
    const start = performance.now();

    const shouldThrow = async ()=> { const result = await ep; };
    await expect(shouldThrow()).rejects.toThrow(errorMessage);
    const end = performance.now();
    expect(end-start).toBeGreaterThanOrEqual(delayMillis-slopMillis);
  });

});

