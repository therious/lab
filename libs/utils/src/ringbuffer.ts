export class RingBuffer<T> {
  private readonly buffer:T[] = [];
  private index:number = 0;

  constructor(private bufferSize:number) {}
  add(value:T):T|undefined {

    const outValue = (this.buffer.length === this.bufferSize)?
    this.buffer[this.index]:undefined;

    this.buffer[this.index++] = value;
    if(this.index >= this.bufferSize)
      this.index = 0;
    return outValue;
  }
  get pindex() { return this.index === 0? this.bufferSize-1: this.index-1; }
  get length() { return this.buffer.length;     }
  get items()  { return this.buffer.slice(0);   }
}
