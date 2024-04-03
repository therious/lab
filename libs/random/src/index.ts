export function randomRange(min:number, max:number):number { return Math.floor(Math.random() * (max - min + 1) + min); }
export function randomValue<T>(arr:T[]):T                  { return arr[randomRange(0, arr.length-1)] }

export class Random<T>
{
  protected history:T[] = [];

  constructor(protected readonly maxTries:number = 3, protected readonly maxHistory:number = 3) {}
  protected remember(item:T):void
  {
    this.history = [...this.history.slice(this.history.length < this.maxHistory?0:1), item];
  }
  protected recent(item:T):boolean
  {
    return this.history.indexOf(item) >= 0;
  }

  // return a "random" member of array, provided it was not recent, to guarantee variety in short samples of small arrays
  random(arr:T[]):T {

    let candidate: T;
    let tries = this.maxTries;
    do {
      candidate = randomValue<T>(arr);
      --tries;
    } while (this.recent(candidate) && tries >= 0); // pick another one if recent

    this.remember(candidate);
    return candidate;
  }
}
