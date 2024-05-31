import {expect, describe, test} from 'vitest'

import  { SlidingBuffer, RingBuffer, RingBufferFull, RingBufferEmpty } from '../ringbuffer';

// todo include tests for sliding buffer also
describe('Sliding Buffer', () => {



  test('potpouri', () => {
    const max = 10;
    const sliding = new SlidingBuffer<number>(max);

    const iterations = max * 2;
    for(let i = 0; i < iterations ; ++i)
    {
      expect(sliding.size).toBe(Math.min(max,i));
      sliding.add(i);
      const items = sliding.items;
      expect(items.length).toBe(sliding.size);
      expect(sliding.size).toBe(Math.min(max,i+1));
    }

  });
});


describe('RingBuffer', () => {
  test('reading an empty buffer throws a RingBufferEmpty Error', () => {
    const buffer = new RingBuffer<string>(1)
    expect(() => buffer.read()).toThrow(RingBufferEmpty)
  });
  test('write and read back one item', () => {
    const buffer = new RingBuffer<string>(1)
    buffer.write('1')
    expect(buffer.read()).toBe('1')
    expect(() => buffer.read()).toThrow(RingBufferEmpty)
  });
  test('write and read back multiple items', () => {
    const buffer = new RingBuffer<string>(2)
    buffer.write('1')
    buffer.write('2')
    expect(buffer.read()).toBe('1')
    expect(buffer.read()).toBe('2')
    expect(() => buffer.read()).toThrow(RingBufferEmpty)
  });
  test('clearing a buffer', () => {
    const buffer = new RingBuffer<string>(2)
    buffer.write('1')
    buffer.write('2')
    buffer.clear()
    expect(() => buffer.read()).toThrow(RingBufferEmpty)
    buffer.write('3')
    buffer.write('4')
    expect(buffer.read()).toBe('3')
    expect(buffer.read()).toBe('4')
  });
  test('alternate write and read', () => {
    const buffer = new RingBuffer<string>(2)
    buffer.write('1')
    expect(buffer.read()).toBe('1')
    buffer.write('2')
    expect(buffer.read()).toBe('2')
  });
  test('reads back oldest item', () => {
    const buffer = new RingBuffer<string>(3)
    buffer.write('1')
    buffer.write('2')
    buffer.read()
    buffer.write('3')
    expect(buffer.read()).toBe('2')
    expect(buffer.read()).toBe('3')
  });
  test('writing to a full buffer throws a RingBufferFull Error', () => {
    const buffer = new RingBuffer<string>(2)
    buffer.write('1')
    buffer.write('2')
    expect(() => buffer.write('A')).toThrow(RingBufferFull)
  });
  test('forced writes over write oldest item in a full buffer', () => {
    const buffer = new RingBuffer<string>(2)
    buffer.write('1')
    buffer.write('2')
    buffer.write('A', true)
    expect(buffer.read()).toBe('2')
    expect(buffer.read()).toBe('A')
    expect(() => buffer.read()).toThrow(RingBufferEmpty)
  });
  test('forced writes act like write in a non-full buffer', () => {
    const buffer = new RingBuffer<string>(2)
    buffer.write('1')
    buffer.write('2', true)
    expect(buffer.read()).toBe('1')
    expect(buffer.read()).toBe('2')
    expect(() => buffer.read()).toThrow(RingBufferEmpty)
  });
  test('alternate force write and read into full buffer', () => {
    const buffer = new RingBuffer<string>(5)
    buffer.write('1')
    buffer.write('2')
    buffer.write('3')
    buffer.read()
    buffer.read()
    buffer.write('4')
    buffer.read()
    buffer.write('5')
    buffer.write('6')
    buffer.write('7')
    buffer.write('8')
    buffer.write('A', true)
    buffer.write('B', true)
    expect(buffer.read()).toBe('6')
    expect(buffer.read()).toBe('7')
    expect(buffer.read()).toBe('8')
    expect(buffer.read()).toBe('A')
    expect(buffer.read()).toBe('B')
    expect(() => buffer.read()).toThrow(RingBufferEmpty)
  });

  const fmt:[string, any] = ['en-US', {useGrouping:true}];
  const writes = 10_000_000;
  const writesStr = writes.toLocaleString(...fmt);

  test(`just log time consumed by ${writesStr} writes`, () => {

    const size = 100;

    const buffer = new RingBuffer<number>(size);
    const start = Date.now();
    for(let i = 0; i < writes; ++i)
      buffer.write(i, true);

   console.log(`elapsed time for ${writesStr} writes is ${(Date.now()-start).toLocaleString(...fmt)}ms`)
   for(let i = 0; i < size; ++i)
    expect(buffer.read()).toBe(writes - (size - i));

  });


})
