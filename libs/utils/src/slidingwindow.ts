import {RingBuffer} from './ringbuffer';

export type StatSummary = {
  mean: number;
  dSquared: number;
  varP: number;
  varS: number;
  stdevP: number;
  stdevS: number;
}

const adjustCloseToZero = (v:number):number=>Math.abs(v) < 0.000_000_000_001? 0: v;

export interface Updater {
  update(n:number):void;
}

// calculates streaming stats without a sliding window, just from beginning
// no samples need to be retained
// use as a base class for SlidingStats version

export class RunningStats implements Updater
{
  #mean: number = 0;
  #dSquared: number = 0;
  #count: number = 0;

  get count():    number { return this.#count;         }
  get mean():     number { return this.#mean;          }
  get dSquared(): number { return this.#dSquared;      }
  get stdevP():   number { return Math.sqrt(this.varP) }
  get stdevS():   number { return Math.sqrt(this.varS) }
  get varP():     number { return                 this.dSquared / this.count        }
  get varS():     number { return this.count > 1? this.dSquared / (this.count-1): 0 }

  get summary(): StatSummary {
    const  {mean, dSquared, varP, varS, stdevP, stdevS} = this;
    return {mean, dSquared, varP, varS, stdevP, stdevS};
  }

  protected replaceStats(mean:number, dSquared:number):void
  {
    this.#mean = mean;
    this.#dSquared = adjustCloseToZero(dSquared);
  }
  update(v:number):void {
    ++this.#count;
    if(this.count === 1)
      this.#mean = v;
    else {
      const mean = this.mean + ((v-this.mean)/this.count);
      const dSquared = this.dSquared + ((v -this.mean) * (v - mean));
      this.replaceStats(mean, dSquared);
    }
  }

} //end class

export class SlidingStats extends RunningStats {
  #ring:RingBuffer<number>;
  constructor(bufferSize:number) {
    super();
    this.#ring = new RingBuffer(bufferSize);
  }
  override get count():number { return this.#ring.length }
  override update(val: number) {
   const oldVal = this.#ring.add(val);
   if(oldVal === undefined)
    return super.update(val); // RunningStats handles this case

    const mean = this.mean + (val - oldVal) / this.count;
    const dSquared = this.dSquared + ((val - oldVal) * (val - mean + oldVal - this.mean));
    this.replaceStats(mean, dSquared);
  }
  // since slidingStats retains values in sliding window, make samples available
  // also makes it useful to test RunningStats with large RingBugger that never wraps against
  // non-incremental brute force stats checks
  get samples():number[] {return this.#ring.items.slice(0)}
  get samplestr():string {
    const ss = this.samples.map((v,i)=>
    {
      const t = (i === this.#ring.pindex)? '*':'';
      return `${t}${v.toFixed(2)}$t`;
    });
    return `[${ss.join(',')}]`;
  }
  bruteSymmary(): StatSummary { return statSummary(this.samples)}

}

const sum = (ns:number[])=>ns.reduce((a,b)=>a+b,0)
const avg = (ns:number[])=>sum(ns) / ns.length;  // todo divide by zero

const statSummary = (ns:number[]):StatSummary => {
  const mean = avg(ns);
  const dSquared = sum(ns.map(n => (n - mean) ** 2));
  const varP = dSquared / ns.length;
  const varS = ns.length > 1 ? dSquared / (ns.length - 1) : 0;
  const stdevP = Math.sqrt(varP);
  const stdevS = Math.sqrt(varS);
  return {mean, dSquared, varP, varS, stdevP, stdevS};
}

export type Histogram = {
  bucketWidth: number;
  rangMin: number;
  rangeMax: number;
  tooSmall: number;
  tooLarge: number;
  buckets: number[];
}

export class HistogramUpdater implements Updater
{
  #buckets: number[];
  #tooSmall: number;    // outside histogram range
  #tooLarge: number;

  #numBuckets:number;
  #rangMin: number;
  #rangeMax: number;
  #bucketWidth: number;


  constructor(min:number, max:number, numBuckets:number) {
    this.#numBuckets = numBuckets;
    this.#rangMin = min;
    this.#rangeMax = max;
    this.#buckets = Array(numBuckets).fill(0);
    this.#tooSmall = 0;
    this.#tooLarge = 0;
    this.#bucketWidth = (max-min)/numBuckets;
  }

  /*
    example 3 buckets for 0-3 >3-6, >6-9
    width = 3
    9 . width = 3
   */

  update(n: number) {
    if(n < this.#rangMin) ++ this.#tooSmall;
    else if (n > this.#rangeMax) ++ this.#tooLarge;
    else
    {
      const normalized = n - this.#rangMin;
      let bucket = Math.trunc(normalized/this.#bucketWidth);
      if(bucket >= this.#numBuckets)  // edge case for exactly largest value
        bucket = this.#numBuckets -1;
      ++this.#buckets[bucket];

    }
  }
  get samples():number[] { return this.#buckets.slice(0)}
  get samplestr():string { return `[${this.samples.join(',')}]`}
  get summary():Histogram
  {
    return {
      tooLarge: this.#tooLarge,
      tooSmall: this.#tooSmall,
      rangMin: this.#rangMin,
      rangeMax: this.#rangeMax,
      bucketWidth: this.#bucketWidth,
      buckets: this.#buckets.slice(0)
    }
  }
}
