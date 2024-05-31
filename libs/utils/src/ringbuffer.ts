export class SlidingBuffer<T> {
  private readonly buffer:T[] = [];
  private index:number = 0;

  constructor(private maxBufferLength:number) {}
  add(value:T):T|undefined {

    const outValue = (this.buffer.length === this.maxBufferLength)?
      this.buffer[this.index]:undefined;

    this.buffer[this.index++] = value;
    if(this.index >= this.maxBufferLength)
      this.index = 0;
    return outValue;
  }
  get pindex() { return this.index === 0? this.maxBufferLength-1: this.index-1; }
  get size()   { return this.buffer.length;     }  // actual length of buffer (it grows till maxBufferLength)
  get items()  { return this.buffer.slice(0);   }  // get a copy of the buffer
}

export  class RingBuffer<T> {
  private readonly buffer: T[];
  private writeCount: number = 0;
  private readCount:  number = 0;
  private readonly resetCount: number;
  constructor(private bufferSize: number) {
    if(bufferSize <= 0)
      throw new RingBufferEmpty();
    // @ 1M reads/writes a second, counters overflow every 285 years
    // so reset the counters when we get close, but stay on the buffersize boundaries
    this.resetCount = (Math.floor(Number.MAX_SAFE_INTEGER / bufferSize)  - 1) * bufferSize;
    this.buffer = Array.from(Array(bufferSize));
  }

  write(value: T, force:boolean = false): T | never {
    if(this.writeCount - this.readCount === this.bufferSize)
    {
      if(force) ++this.readCount;            // we are writing anyway, so must lose a read value
      else      throw new RingBufferFull();  // throwing an error rather than writing when buffer is full
    }
    return this.buffer[this.writeCount++ % this.bufferSize] = value; // both assign and return the passed value
  }

  read(): T | never {
    if(this.writeCount > this.resetCount)  // could overflow after a couple of centuries at very high speeds
    {
      this.writeCount -= this.resetCount;  // maintain the same difference, shrink the counts before overflow
      this.readCount  -= this.resetCount;
    }
    if(this.readCount === this.writeCount)
      throw new RingBufferEmpty();
    return this.buffer[this.readCount++ % this.bufferSize];
  }

  clear(): void {
    this.readCount = this.writeCount; // position is unimportant
  }
}

export class RingBufferFull  extends Error {}
export class RingBufferEmpty extends Error {}
