export class Deck<T>
{
  constructor(protected cards:T[]) {}

  shuffle() {
    const array = this.cards;
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  deal(ncards: number): T[]
  {
    if(this.cards.length < ncards)
      throw new Error(`not enough cards`);
    const result = this.cards.slice(0, ncards);
    this.cards = this.cards.slice(ncards);
    return result;
  }
}
